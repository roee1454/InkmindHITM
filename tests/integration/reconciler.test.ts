import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import { createConversation, createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/lib/queue/conversation-turn-queue', () => ({ enqueueLifecycleMessage: vi.fn().mockResolvedValue(undefined) }))
const addSystemNotification = vi.fn().mockResolvedValue(null)
vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: (...args: unknown[]) => addSystemNotification(...args) }))

const { processConversationDrift } = await import('@/features/lifecycle/server/lifecycle-service')
const { reconcileCustomerConversation } = await import('@/features/conversations/server/reconciler.server')

// The lifecycle reconciler (track-b B3.5): a conversation whose state contradicts the appointments and
// the project is corrected through the state machine, and staff are told. The tick runs an hour
// ahead, past the grace period a freshly entered state gets.
let pb: PocketBase
const anHourAhead = () => new Date(Date.now() + 60 * 60 * 1000)

beforeAll(async () => {
  pb = await superuserClient()
})

async function conversationIn(state: string, customerId: string, fields: Record<string, unknown> = {}) {
  const { conversation } = await createConversation(pb, customerId)
  return pb.collection('conversations').update(conversation.id, { state, ...stateAttribution('system', 'test_setup'), ...fields })
}

async function appointment(customerId: string, status: string, hours = 48) {
  return pb.collection('appointments').create({ customer: customerId, kind: 'session', start_time: hoursFromNow(hours), ...statusChange(status as never, 'staff', 'test') })
}

async function lastTransition(conversationId: string) {
  const [latest] = await pb.collection('state_transitions').getFullList({
    filter: pb.filter("entity = 'conversations' && entity_id = {:id}", { id: conversationId }),
    sort: '-created,-id',
  })
  return latest
}

describe('the reconciler', () => {
  it('sends a conversation back to collecting info when staff cancelled its hold in the calendar, and tells staff', async () => {
    const customer = await createCustomer(pb, { name: 'דנה' })
    const hold = await appointment(customer.id, 'pending')
    const conv = await conversationIn('AWAIT_PAYMENT', customer.id, { active_project: hold.project })
    await pb.collection('appointments').update(hold.id, statusChange('cancelled', 'staff', 'calendar'))
    addSystemNotification.mockClear()

    await processConversationDrift(pb, anHourAhead())

    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('COLLECTING_INFO')
    expect(await lastTransition(conv.id)).toMatchObject({ from: 'AWAIT_PAYMENT', to: 'COLLECTING_INFO', actor: 'system', reason: 'reconciler_hold_gone' })
    expect(addSystemNotification).toHaveBeenCalledWith(expect.objectContaining({ title: 'מצב השיחה תוקן אוטומטית', link: `/dashboard/conversations?chatId=${conv.id}` }))
  })

  it('moves a conversation on to the booked appointment when staff confirmed the hold by hand', async () => {
    const customer = await createCustomer(pb)
    const booked = await appointment(customer.id, 'confirmed')
    const conv = await conversationIn('AWAIT_PRICE_OFFER', customer.id, { active_project: booked.project })

    await processConversationDrift(pb, anHourAhead())

    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('AWAITING_APPOINTMENT')
  })

  it('ends the wait between sessions once the project was completed', async () => {
    const customer = await createCustomer(pb)
    const session = await pb.collection('appointments').create({
      customer: customer.id,
      kind: 'session',
      start_time: hoursFromNow(-48),
      final_price: 800,
      ...statusChange('completed', 'staff', 'test'),
    })
    const conv = await conversationIn('PROJECT_IN_PROGRESS', customer.id, { active_project: session.project })
    await pb.collection('projects').update(session.project as string, { completed_at: new Date().toISOString(), stage_actor: 'staff', stage_reason: 'test' })

    await processConversationDrift(pb, anHourAhead())

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COMPLETED', active_project: '' })
  })

  it('leaves a conversation whose state matches the facts alone', async () => {
    const customer = await createCustomer(pb)
    const hold = await appointment(customer.id, 'pending')
    const conv = await conversationIn('AWAIT_PAYMENT', customer.id, { active_project: hold.project })

    const plan: Parameters<typeof processConversationDrift>[2] = { dryRun: true, plan: [] }
    await processConversationDrift(pb, anHourAhead(), plan)

    expect(plan.plan?.some((a) => a.kind === 'reconcile_conversation' && a.conversationId === conv.id)).toBe(false)
  })

  it('only plans in a dry run, and leaves conversations the tick already moves to the tick', async () => {
    const customer = await createCustomer(pb)
    const hold = await appointment(customer.id, 'pending')
    const conv = await conversationIn('AWAIT_PAYMENT', customer.id, { active_project: hold.project })
    await pb.collection('appointments').update(hold.id, statusChange('cancelled', 'staff', 'calendar'))

    const dry = { dryRun: true, plan: [] as NonNullable<Parameters<typeof processConversationDrift>[2]>['plan'] }
    await processConversationDrift(pb, anHourAhead(), dry)
    expect(dry.plan?.find((a) => a.kind === 'reconcile_conversation' && a.conversationId === conv.id)).toMatchObject({ from: 'AWAIT_PAYMENT', to: 'COLLECTING_INFO' })
    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('AWAIT_PAYMENT')

    const alreadyMoved = { dryRun: true, plan: [{ kind: 'transition_conversation' as const, conversationId: conv.id, to: 'COLLECTING_INFO', reason: 'stale' }] }
    await processConversationDrift(pb, anHourAhead(), alreadyMoved)
    expect(alreadyMoved.plan.filter((a) => a.conversationId === conv.id)).toHaveLength(1)
  })
})

describe('right after staff change the calendar', () => {
  it('moves a conversation between sessions to the next session staff booked on the spot, without telling staff', async () => {
    const customer = await createCustomer(pb)
    const session = await pb.collection('appointments').create({
      customer: customer.id,
      kind: 'session',
      start_time: hoursFromNow(-3),
      final_price: 800,
      ...statusChange('completed', 'staff', 'test'),
    })
    // Closing the session left the conversation between sessions, a moment ago.
    const conv = await conversationIn('PROJECT_IN_PROGRESS', customer.id, { active_project: session.project })
    const next = await pb.collection('appointments').create({
      customer: customer.id,
      project: session.project,
      kind: 'session',
      start_time: hoursFromNow(24 * 21),
      ...statusChange('confirmed', 'staff', 'staff_created'),
    })
    addSystemNotification.mockClear()

    await reconcileCustomerConversation(pb, customer.id)

    expect(next.project).toBe(session.project)
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'AWAITING_APPOINTMENT', active_project: session.project })
    expect(await lastTransition(conv.id)).toMatchObject({ from: 'PROJECT_IN_PROGRESS', to: 'AWAITING_APPOINTMENT', reason: 'reconciler_session_booked' })
    expect(addSystemNotification).not.toHaveBeenCalled()
  })

  it('sends a conversation back to collecting info as soon as staff cancel its hold', async () => {
    const customer = await createCustomer(pb)
    const hold = await appointment(customer.id, 'pending')
    const conv = await conversationIn('AWAIT_PRICE_OFFER', customer.id, { active_project: hold.project })
    await pb.collection('appointments').update(hold.id, statusChange('cancelled', 'staff', 'calendar'))

    await reconcileCustomerConversation(pb, customer.id)

    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('COLLECTING_INFO')
  })
})
