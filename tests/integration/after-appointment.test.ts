import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import { createConversation, createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: vi.fn().mockResolvedValue(null) }))

const { applyConversationAdvance, planConversationAdvance } = await import('@/features/conversations/server/after-appointment.server')

// Where the conversation goes once an appointment is over (track-b B3.3): a session of a project
// that goes on waits for the next one in PROJECT_IN_PROGRESS; the funnel ends only with the project.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function finished(customerId: string, kind: 'session' | 'consultation', projectId = '') {
  return pb.collection('appointments').create({
    customer: customerId,
    project: projectId,
    kind,
    start_time: hoursFromNow(-30),
    ...(kind === 'session' ? { final_price: 1000 } : {}),
    ...statusChange('completed', 'staff', 'test'),
  })
}

async function conversationIn(state: string, customerId: string, projectId: string) {
  const { conversation } = await createConversation(pb, customerId)
  return pb.collection('conversations').update(conversation.id, { state, active_project: projectId, ...stateAttribution('system', 'test_setup') })
}

async function advance(appointment: Awaited<ReturnType<typeof finished>>) {
  const plan = await planConversationAdvance(pb, appointment, { upcomingAfter: new Date(), reason: 'test_advance' })
  if (plan) await applyConversationAdvance(pb, plan, 'system')
  return plan
}

const completeProject = (projectId: string) => pb.collection('projects').update(projectId, { completed_at: new Date().toISOString(), stage_actor: 'staff', stage_reason: 'test' })

describe('after a session', () => {
  it('waits for the next session while the project goes on, keeping the project', async () => {
    const customer = await createCustomer(pb)
    const session = await finished(customer.id, 'session')
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, session.project as string)

    expect(await advance(session)).toMatchObject({ to: 'PROJECT_IN_PROGRESS' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'PROJECT_IN_PROGRESS', active_project: session.project })
  })

  it('ends the funnel when the session completed the project', async () => {
    const customer = await createCustomer(pb)
    const session = await finished(customer.id, 'session')
    await completeProject(session.project as string)
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, session.project as string)

    expect(await advance(session)).toMatchObject({ to: 'COMPLETED' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COMPLETED', active_project: '' })
  })

  it('ends the funnel of a conversation between sessions once closing a session completes the project', async () => {
    const customer = await createCustomer(pb)
    const session = await finished(customer.id, 'session')
    const conv = await conversationIn('PROJECT_IN_PROGRESS', customer.id, session.project as string)

    // Still open: nothing moves.
    expect(await advance(session)).toBeNull()
    await completeProject(session.project as string)
    expect(await advance(session)).toMatchObject({ to: 'COMPLETED' })
    expect((await pb.collection('conversations').getOne(conv.id)).state).toBe('COMPLETED')
  })

  it('leaves a conversation between sessions of another project alone', async () => {
    const customer = await createCustomer(pb)
    const other = await finished(customer.id, 'session')
    const session = await finished(customer.id, 'session')
    await completeProject(session.project as string)
    await conversationIn('PROJECT_IN_PROGRESS', customer.id, other.project as string)

    expect(await advance(session)).toBeNull()
  })
})

describe('after a consultation', () => {
  it('goes on to booking the tattoo in the same project', async () => {
    const customer = await createCustomer(pb)
    const consultation = await finished(customer.id, 'consultation')
    const conv = await conversationIn('AWAITING_APPOINTMENT', customer.id, consultation.project as string)

    expect(await advance(consultation)).toMatchObject({ to: 'WANTS_TO_BOOK' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'WANTS_TO_BOOK', active_project: consultation.project })
  })
})
