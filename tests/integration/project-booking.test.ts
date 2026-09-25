import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { createAppointment, createConversation, createCustomer, createStaff, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn().mockResolvedValue({ staff: { id: 'staff-actor', role: 'admin' } }),
  requireAdmin: vi.fn().mockResolvedValue({ staff: { id: 'staff-actor', role: 'admin' } }),
}))

const { createAppointmentHandler } = await import('@/features/calendar/server/appointments.server')
const { createPendingHoldForBot } = await import('@/features/calendar/server/bot-appointments.server')
const { transition } = await import('@/features/conversations/server/state-machine')

let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

function daysAhead(days: number): string {
  const date = new Date(Date.now() + days * 86_400_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

describe('booking inside a project', () => {
  it('books "continue to tattoo" as the next step of the consultation\'s project', async () => {
    const customer = await createCustomer(pb)
    const consultation = await pb.collection('appointments').create({
      customer: customer.id,
      start_time: new Date(Date.now() - 86_400_000).toISOString(),
      status: 'completed',
      kind: 'consultation',
    })

    const { id } = await createAppointmentHandler({
      projectId: consultation.project,
      customerId: customer.id,
      date: daysAhead(30),
      timeSlot: '12:00',
      type: 'tattoo',
    })

    expect(await pb.collection('appointments').getOne(id)).toMatchObject({ project: consultation.project, kind: 'session' })
  })

  it("explains in Hebrew when the chosen project belongs to someone else", async () => {
    const owner = await createCustomer(pb)
    const other = await createCustomer(pb)
    const ownersAppointment = await createAppointment(pb, { customer: owner.id, startsInHours: 10, status: 'pending' })

    await expect(
      createAppointmentHandler({ projectId: ownersAppointment.project, customerId: other.id, date: daysAhead(31), timeSlot: '12:00' }),
    ).rejects.toThrow('הפרויקט שנבחר שייך ללקוח אחר')
  })

  it("keeps the bot's holds in the project it's booking for, across a rebooked hold", async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id)

    const first = await createPendingHoldForBot(pb, {
      customerId: customer.id,
      staffId: artist.id,
      date: daysAhead(40),
      timeSlot: '10:00',
      durationHours: 2,
      tattooDescription: 'ורד',
      allowException: true,
    })
    const firstHold = await pb.collection('appointments').getOne(first.appointmentId ?? '')
    expect((await pb.collection('conversations').getOne(conversation.id)).active_project).toBe(firstHold.project)

    const second = await createPendingHoldForBot(pb, {
      customerId: customer.id,
      staffId: artist.id,
      date: daysAhead(41),
      timeSlot: '10:00',
      durationHours: 2,
      tattooDescription: 'ורד',
      allowException: true,
    })
    const secondHold = await pb.collection('appointments').getOne(second.appointmentId ?? '')
    expect(secondHold.project).toBe(firstHold.project)
    expect((await pb.collection('appointments').getOne(firstHold.id)).status).toBe('cancelled')
  })

  it('starts a fresh project for the next inquiry once the funnel completes', async () => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id)
    const done = await createAppointment(pb, { customer: customer.id, startsInHours: -30, status: 'completed' })
    await pb.collection('conversations').update(conversation.id, { active_project: done.project, state: 'AWAITING_APPOINTMENT' })

    await transition(pb, conversation.id, 'COMPLETED', { actor: 'system', reason: 'test' })

    expect((await pb.collection('conversations').getOne(conversation.id)).active_project).toBe('')
  })
})
