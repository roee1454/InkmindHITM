import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import { createConversation, createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: vi.fn().mockResolvedValue(null) }))

const { routeInboundMessage } = await import('@/features/conversations/server/inbound-routing.server')
const { ensureInquiryProject } = await import('@/features/projects/server/inquiry-project.server')
const { handleResetBotConversation } = await import('@/features/conversations/server/bot-reset.server')

// A customer writing again after their booking, against a real PocketBase: the state moves through
// the state machine (the hook would reject anything else) and the right project stays attached.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function conversationIn(state: string, customerId: string, fields: Record<string, unknown> = {}) {
  const { conversation } = await createConversation(pb, customerId)
  return pb.collection('conversations').update(conversation.id, { state, ...stateAttribution('system', 'test_setup'), ...fields })
}

async function appointmentIn(projectOf: string | null, customerId: string, kind: string, status: string, hours: number) {
  return pb.collection('appointments').create({
    customer: customerId,
    project: projectOf ?? '',
    kind,
    start_time: hoursFromNow(hours),
    ...(status === 'completed' && kind !== 'consultation' ? { final_price: 1000 } : {}),
    ...statusChange(status as never, 'staff', 'test'),
  })
}

const nowIso = () => new Date().toISOString()

describe('a customer writing again after their booking', () => {
  it('does not attach the next tattoo to a finished project (the project leak)', async () => {
    const customer = await createCustomer(pb)
    const session = await appointmentIn(null, customer.id, 'session', 'completed', -5)
    await pb.collection('projects').update(session.project as string, { completed_at: new Date().toISOString() })
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, { active_project: session.project })

    await routeInboundMessage(pb, conv, { hasUpcomingAppointment: false, aiEnabled: true, nowIso: nowIso() })

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'NEW', active_project: '' })
    const next = await ensureInquiryProject(pb, conv.id, customer.id, 'continue')
    expect(next).not.toBe(session.project)
  })

  it('waits for the next session of an open multi-session project, with the project attached', async () => {
    const customer = await createCustomer(pb)
    const session = await appointmentIn(null, customer.id, 'session', 'completed', -5)
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, { active_project: session.project })

    await routeInboundMessage(pb, conv, { hasUpcomingAppointment: false, aiEnabled: true, nowIso: nowIso() })

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'PROJECT_IN_PROGRESS', active_project: session.project })
    // The next session joins the same project.
    expect(await ensureInquiryProject(pb, conv.id, customer.id, 'continue')).toBe(session.project)
  })

  it('goes straight to booking the tattoo after a consultation, in the same project', async () => {
    const customer = await createCustomer(pb)
    const consultation = await appointmentIn(null, customer.id, 'consultation', 'completed', -5)
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, { active_project: consultation.project })

    await routeInboundMessage(pb, conv, { hasUpcomingAppointment: false, aiEnabled: true, nowIso: nowIso() })

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'WANTS_TO_BOOK', active_project: consultation.project })
    expect(conv.state).toBe('WANTS_TO_BOOK')
  })

  it('keeps waiting for a feedback answer instead of wiping it', async () => {
    const customer = await createCustomer(pb)
    const conv = await conversationIn('AWAIT_NPS_SCORE', customer.id)

    await routeInboundMessage(pb, conv, { hasUpcomingAppointment: false, aiEnabled: true, nowIso: nowIso() })

    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('AWAIT_NPS_SCORE')
  })

  it('logs the move with the customer as the actor', async () => {
    const customer = await createCustomer(pb)
    const conv = await conversationIn('COMPLETED', customer.id)

    await routeInboundMessage(pb, conv, { hasUpcomingAppointment: false, aiEnabled: true, nowIso: nowIso() })

    const [latest] = await pb.collection('state_transitions').getFullList({
      filter: pb.filter("entity = 'conversations' && entity_id = {:id}", { id: conv.id }),
      sort: '-created,-id',
    })
    expect(latest).toMatchObject({ from: 'COMPLETED', to: 'NEW', actor: 'customer', reason: 'inbound_after_completed' })
  })
})

describe('staff resetting the bot', () => {
  it('starts the conversation over from any state, detaches the project, and logs it as a staff override', async () => {
    const customer = await createCustomer(pb)
    const hold = await appointmentIn(null, customer.id, 'session', 'pending', 48)
    const conv = await conversationIn('AWAIT_PAYMENT', customer.id, { active_project: hold.project, status: 'staff_handling', is_staff_called: true })

    await handleResetBotConversation(conv.id, { su: pb })

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'NEW', active_project: '', status: 'bot_active', is_staff_called: false })
    const overrides = await pb.collection('audit_log').getFullList({ filter: pb.filter('conversation = {:c}', { c: conv.id }) })
    expect(overrides.map((row) => row.reason)).toEqual(['STAFF_OVERRIDE: staff_reset'])
  })
})
