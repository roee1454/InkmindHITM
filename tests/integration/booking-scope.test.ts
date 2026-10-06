import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import type { BotToolsContext } from '@/integrations/ai/tools.server'
import type { ConversationState } from '@/integrations/ai/prompts'
import { createConversation, createCustomer, createStaff, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: vi.fn().mockResolvedValue(null) }))
vi.mock('@/integrations/google-calendar/server/google-sync.server', () => ({ syncAppointmentToGoogle: vi.fn().mockResolvedValue(undefined) }))

const { buildBotTools } = await import('@/integrations/ai/tools.server')

// The bot booking the next session or a touch-up of a piece the studio already has (track-b B4.2):
// it joins the same project, and a touch-up follows the studio's policy.
let pb: PocketBase
let settings: RecordModel
let staffId: string

beforeAll(async () => {
  pb = await superuserClient()
  const existing = await pb.collection('settings').getList(1, 1)
  settings = existing.items[0] ?? (await pb.collection('settings').create({ studio_name: 'סטודיו בדיקה', timezone: 'Asia/Jerusalem', currency: 'ILS' }))
  staffId = (await createStaff(pb)).id
})

afterAll(async () => {
  await pb.collection('settings').update(settings.id, { touch_up_policy: '', touch_up_free_days: 0 })
})

async function run(conversationId: string, customerId: string, tool: string, args: Record<string, unknown>) {
  const conversation = await pb.collection('conversations').getOne(conversationId)
  const tools = buildBotTools({
    su: pb,
    conversationId,
    customerId,
    runtimeConfig: {} as BotToolsContext['runtimeConfig'],
    conversationState: conversation.state as ConversationState,
    conversationStatus: 'bot_active',
    staffCallReason: null,
  }) as Record<string, { execute?: (input: unknown, options: unknown) => Promise<unknown> }>
  return tools[tool]?.execute?.(args, { toolCallId: tool, messages: [] }) as Promise<{ status: string; message: string }>
}

async function finishedSession(customerId: string) {
  return pb.collection('appointments').create({
    customer: customerId,
    staff: staffId,
    kind: 'session',
    start_time: hoursFromNow(-24 * 5),
    final_price: 1000,
    ...statusChange('completed', 'staff', 'test'),
  })
}

async function conversationIn(state: string, customerId: string, projectId: string) {
  const { conversation } = await createConversation(pb, customerId)
  return pb.collection('conversations').update(conversation.id, { state, active_project: projectId, ...stateAttribution('system', 'test_setup') })
}

function inDays(days: number) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function holdVia(conversationId: string, customerId: string, day: number) {
  return run(conversationId, customerId, 'collect_tattoo_info', { staffId, date: inDays(day), timeSlot: '11:00', durationHours: 3, designDescription: 'המשך', placementSpot: 'יד' })
}

describe('the next session', () => {
  it('goes straight to collecting details and holds the slot in the same project, without asking for a photo', async () => {
    const customer = await createCustomer(pb)
    const session = await finishedSession(customer.id)
    const conv = await conversationIn('PROJECT_IN_PROGRESS', customer.id, session.project as string)

    expect(await run(conv.id, customer.id, 'start_booking', {})).toMatchObject({ status: 'success' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COLLECTING_INFO', active_project: session.project })

    expect(await holdVia(conv.id, customer.id, 30)).toMatchObject({ status: 'success' })
    const [hold] = await pb.collection('appointments').getFullList({ filter: pb.filter("customer = {:c} && status = 'pending'", { c: customer.id }) })
    expect(hold).toMatchObject({ project: session.project, kind: 'session' })
  })

  it('is refused when nothing is under way', async () => {
    const customer = await createCustomer(pb)
    const conv = await conversationIn('COMPLETED', customer.id, '')

    expect(await run(conv.id, customer.id, 'start_booking', { scope: 'next_session' })).toMatchObject({ status: 'error' })
    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('COMPLETED')
  })
})

describe('a touch-up', () => {
  async function finishedPiece() {
    const customer = await createCustomer(pb)
    const session = await finishedSession(customer.id)
    await pb.collection('projects').update(session.project as string, { completed_at: new Date().toISOString(), stage_actor: 'staff', stage_reason: 'test' })
    const conv = await conversationIn('COMPLETED', customer.id, '')
    return { customer, project: session.project as string, conv }
  }

  it('goes to staff while the studio has no touch-up policy', async () => {
    await pb.collection('settings').update(settings.id, { touch_up_policy: '', touch_up_free_days: 0 })
    const { customer, project, conv } = await finishedPiece()

    await run(conv.id, customer.id, 'start_booking', { scope: 'touch_up' })

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COMPLETED', status: 'escalated', staff_call_reason: 'touch_up_request', active_project: project })
  })

  it("holds a touch-up in the finished piece's project, which stays completed", async () => {
    await pb.collection('settings').update(settings.id, { touch_up_policy: 'free_within_days', touch_up_free_days: 30 })
    const { customer, project, conv } = await finishedPiece()

    expect(await run(conv.id, customer.id, 'start_booking', { scope: 'touch_up' })).toMatchObject({ status: 'success' })
    expect(await holdVia(conv.id, customer.id, 20)).toMatchObject({ status: 'success' })

    const [hold] = await pb.collection('appointments').getFullList({ filter: pb.filter("customer = {:c} && status = 'pending'", { c: customer.id }) })
    expect(hold).toMatchObject({ project, kind: 'touch_up' })
    expect((await pb.collection('projects').getOne(project)).stage).toBe('completed')
    expect((await pb.collection('conversations').getOne(conv.id)).tattoo_info).toMatchObject({ bookingScope: 'touch_up', touchUpTerms: 'free' })
  })
})

describe('after a consultation', () => {
  it('books the tattoo, and a second consultation only when the customer asked for one', async () => {
    const customer = await createCustomer(pb)
    const consultation = await pb.collection('appointments').create({
      customer: customer.id,
      staff: staffId,
      kind: 'consultation',
      start_time: hoursFromNow(-24 * 2),
      ...statusChange('completed', 'staff', 'test'),
    })
    const conv = await conversationIn('WANTS_TO_BOOK', customer.id, consultation.project as string)

    expect(await run(conv.id, customer.id, 'choose_booking_track', { track: 'sketch' })).toMatchObject({ status: 'error' })
    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('WANTS_TO_BOOK')

    expect(await run(conv.id, customer.id, 'choose_booking_track', { track: 'sketch', customerAskedForConsultation: true })).toMatchObject({ status: 'success' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COLLECTING_INFO', active_project: consultation.project })
  })
})
