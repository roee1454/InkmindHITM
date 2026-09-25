import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { createAppointment, createConversation, createCustomer, superuserClient } from './helpers/pocketbase'
import { stateAttribution } from '@/features/conversations/server/state-machine'

const enqueueLifecycleMessage = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/queue/conversation-turn-queue', () => ({
  enqueueLifecycleMessage: (...args: unknown[]) => enqueueLifecycleMessage(...args),
}))

const { runLifecycleTick } = await import('@/features/lifecycle/server/lifecycle-service')

const HOUR_MS = 60 * 60 * 1000
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

beforeEach(() => {
  enqueueLifecycleMessage.mockClear()
})

// Lifecycle timing is tested by handing the engine a simulated "now" — never by moving the
// machine's clock (see src/features/lifecycle/server/lifecycle-simulation.ts).
describe('lifecycle tick at a simulated time', () => {
  it('plans the 1-day reminder without sending or writing anything in a dry run', async () => {
    const customer = await createCustomer(pb, { name: 'מיכל' })
    const appointment = await createAppointment(pb, { customer: customer.id, startsInHours: 50, status: 'confirmed' })

    const tomorrow = new Date(Date.now() + 24 * HOUR_MS)
    const result = await runLifecycleTick(pb, tomorrow, { dryRun: true })

    const reminder = result.plan?.find(
      (action) => action.kind === 'message' && action.target.kind === 'appointment_trigger' && action.target.appointmentId === appointment.id,
    )
    expect(reminder).toMatchObject({ kind: 'message', trigger: 'reminder_1d', customerId: customer.id })
    expect(enqueueLifecycleMessage).not.toHaveBeenCalled()

    // Today there's nothing to send for it yet.
    const today = await runLifecycleTick(pb, new Date(), { dryRun: true })
    expect(today.plan?.some((a) => a.kind === 'message' && a.customerId === customer.id)).toBe(false)
  })

  it('releases pending appointments older than 48 hours (formerly a PocketBase cron)', async () => {
    const customer = await createCustomer(pb)
    const pending = await createAppointment(pb, { customer: customer.id, startsInHours: 200, status: 'pending' })
    const { conversation } = await createConversation(pb, customer.id)
    await pb.collection('conversations').update(conversation.id, { state: 'AWAIT_PAYMENT', ...stateAttribution('system', 'test_setup') })

    const inTwoDays = new Date(Date.now() + 49 * HOUR_MS)

    const dry = await runLifecycleTick(pb, inTwoDays, { dryRun: true })
    expect(dry.plan).toEqual(
      expect.arrayContaining([
        { kind: 'cancel_stale_pending', appointmentId: pending.id },
        { kind: 'transition_conversation', conversationId: conversation.id, to: 'COLLECTING_INFO', reason: 'stale_pending_appointment_expired_48h' },
      ]),
    )
    expect((await pb.collection('appointments').getOne(pending.id)).status).toBe('pending')

    await runLifecycleTick(pb, inTwoDays)

    expect((await pb.collection('appointments').getOne(pending.id)).status).toBe('cancelled')
    expect((await pb.collection('conversations').getOne(conversation.id)).state).toBe('COLLECTING_INFO')
  })

  it('leaves a pending appointment alone before 48 hours have passed', async () => {
    const customer = await createCustomer(pb)
    const pending = await createAppointment(pb, { customer: customer.id, startsInHours: 200, status: 'pending' })

    const result = await runLifecycleTick(pb, new Date(Date.now() + 47 * HOUR_MS), { dryRun: true })

    expect(result.plan?.some((a) => a.kind === 'cancel_stale_pending' && a.appointmentId === pending.id)).toBe(false)
  })
})
