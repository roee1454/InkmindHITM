import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { stateAttribution } from '@/features/conversations/server/state-machine'
import type { LifecyclePlannedAction } from '@/features/lifecycle/server/lifecycle-run'
import { createConversation, createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/lib/queue/conversation-turn-queue', () => ({ enqueueLifecycleMessage: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/features/notifications/server/notifications', () => ({ addSystemNotification: vi.fn().mockResolvedValue(null) }))

const { processProjectFeedback, processConsultationFollowups, processStalledProjects, processStaffDigest, awaitFeedbackScore } = await import(
  '@/features/lifecycle/server/project-lifecycle.server'
)
const { processHealingFollowUp } = await import('@/features/lifecycle/server/lifecycle-service')

// The project-level lifecycle (track-b B5), against a real PocketBase. Dry runs record the plan.
let pb: PocketBase
let settings: RecordModel
const DAY = 86_400_000

beforeAll(async () => {
  pb = await superuserClient()
  const existing = await pb.collection('settings').getList(1, 1)
  settings = existing.items[0] ?? (await pb.collection('settings').create({ studio_name: 'סטודיו בדיקה', timezone: 'Asia/Jerusalem', currency: 'ILS' }))
})

afterAll(async () => {
  await pb.collection('settings').update(settings.id, { post_project_feedback: '' })
})

function dryRun() {
  return { dryRun: true, plan: [] as LifecyclePlannedAction[] }
}

function messagesFor(plan: LifecyclePlannedAction[], customerId: string) {
  return plan.flatMap((a) => (a.kind === 'message' && a.customerId === customerId ? [a] : []))
}

async function session(customerId: string, status: string, startsInHours: number, project = '') {
  return pb.collection('appointments').create({
    customer: customerId,
    project,
    kind: 'session',
    start_time: hoursFromNow(startsInHours),
    ...(status === 'completed' ? { final_price: 900 } : {}),
    ...statusChange(status as never, 'staff', 'test'),
  })
}

async function conversationIn(state: string, customerId: string, fields: Record<string, unknown> = {}) {
  const { conversation } = await createConversation(pb, customerId)
  return pb.collection('conversations').update(conversation.id, { state, ...stateAttribution('system', 'test_setup'), ...fields })
}

async function completedProject(hoursAgo: number) {
  const customer = await createCustomer(pb, { name: 'דנה' })
  const done = await session(customer.id, 'completed', -hoursAgo - 3)
  await pb.collection('projects').update(done.project as string, { completed_at: hoursFromNow(-hoursAgo), stage_actor: 'staff', stage_reason: 'test' })
  return { customer, project: done.project as string }
}

describe('feedback at the end of the project', () => {
  it('asks for reviews a few hours after the project is completed, once per project', async () => {
    await pb.collection('settings').update(settings.id, { post_project_feedback: 'review_links' })
    const { customer, project } = await completedProject(5)

    const run = dryRun()
    await processProjectFeedback(pb, new Date(), run)
    expect(messagesFor(run.plan, customer.id)).toEqual([
      expect.objectContaining({ trigger: 'review_request', target: { kind: 'project_trigger', projectId: project, trigger: 'feedback', awaitScore: false } }),
    ])

    await pb.collection('projects').update(project, { lifecycle_sent: [{ trigger: 'feedback', sent_at: new Date().toISOString() }] })
    const again = dryRun()
    await processProjectFeedback(pb, new Date(), again)
    expect(messagesFor(again.plan, customer.id)).toEqual([])
  })

  it('asks for a 1–10 score first when the studio wants it, unless the customer is booking again', async () => {
    await pb.collection('settings').update(settings.id, { post_project_feedback: 'nps_then_review' })
    const { customer } = await completedProject(5)
    await conversationIn('COMPLETED', customer.id)
    const busy = await completedProject(5)
    await conversationIn('COLLECTING_INFO', busy.customer.id)

    const run = dryRun()
    await processProjectFeedback(pb, new Date(), run)
    expect(messagesFor(run.plan, customer.id)[0]).toMatchObject({ trigger: 'nps_request', target: { awaitScore: true } })
    expect(messagesFor(run.plan, busy.customer.id)[0]).toMatchObject({ trigger: 'review_request' })
  })

  it('waits for the answer about that project once the question went out', async () => {
    const { customer, project } = await completedProject(5)
    const conv = await conversationIn('COMPLETED', customer.id)

    await awaitFeedbackScore(pb, conv.id, project)

    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'AWAIT_NPS_SCORE', active_project: project })
  })
})

describe('the follow-up after a consultation', () => {
  it('goes out a few days after the consultation when nothing was booked', async () => {
    const customer = await createCustomer(pb)
    const consultation = await pb.collection('appointments').create({ customer: customer.id, kind: 'consultation', start_time: hoursFromNow(-24 * 5), ...statusChange('completed', 'staff', 'test') })
    await conversationIn('WANTS_TO_BOOK', customer.id, { active_project: consultation.project })
    const project = consultation.project as string

    const early = dryRun()
    await processConsultationFollowups(pb, new Date(), early)
    expect(messagesFor(early.plan, customer.id)).toEqual([])

    const run = dryRun()
    await processConsultationFollowups(pb, new Date(Date.now() + 4 * DAY), run)
    expect(messagesFor(run.plan, customer.id)).toEqual([
      expect.objectContaining({ trigger: 'consultation_followup', target: { kind: 'project_trigger', projectId: project, trigger: 'consultation_followup' } }),
    ])
  })
})

describe('a project that stopped moving', () => {
  it('is lost for lack of response, and the conversation booking it closes', async () => {
    const customer = await createCustomer(pb)
    const conv = await conversationIn('COLLECTING_INFO', customer.id)
    const project = await pb.collection('projects').create({ customer: customer.id, title: 'פנייה', stage_actor: 'bot', stage_reason: 'booking_started' })
    await pb.collection('conversations').update(conv.id, { active_project: project.id, last_message_at: new Date().toISOString() })

    await processStalledProjects(pb, new Date(Date.now() + 8 * DAY))

    expect(await pb.collection('projects').getOne(project.id)).toMatchObject({ stage: 'lost', lost_reason: 'no_response' })
    expect(await pb.collection('conversations').getOne(conv.id)).toMatchObject({ state: 'COMPLETED', status: 'closed' })
  })

  it('is kept while the customer waits on the waitlist', async () => {
    const customer = await createCustomer(pb)
    const conv = await conversationIn('WAITLIST', customer.id)
    const project = await pb.collection('projects').create({ customer: customer.id, title: 'פנייה', stage_actor: 'bot', stage_reason: 'booking_started' })
    await pb.collection('conversations').update(conv.id, { active_project: project.id, last_message_at: new Date().toISOString() })

    const run = dryRun()
    await processStalledProjects(pb, new Date(Date.now() + 8 * DAY), run)

    expect(run.plan.some((a) => a.kind === 'mark_project_lost' && a.projectId === project.id)).toBe(false)
  })
})

describe('the healing check', () => {
  it('invites the next session between sessions, and skips consultations', async () => {
    const customer = await createCustomer(pb)
    await session(customer.id, 'completed', -24 * 16)
    const consultationOnly = await createCustomer(pb)
    await pb.collection('appointments').create({ customer: consultationOnly.id, kind: 'consultation', start_time: hoursFromNow(-24 * 16), ...statusChange('completed', 'staff', 'test') })

    const run = dryRun()
    await processHealingFollowUp(pb, new Date(), run, 21)

    expect(messagesFor(run.plan, customer.id)).toEqual([expect.objectContaining({ trigger: 'healing_check' })])
    expect(messagesFor(run.plan, consultationOnly.id)).toEqual([])
  })
})

describe('the daily staff digest', () => {
  it('lists the sessions still waiting to be closed, in one notification', async () => {
    const customer = await createCustomer(pb)
    await session(customer.id, 'confirmed', -48)

    // 10:00 in Israel, tomorrow.
    const tomorrowMorning = new Date(Date.now() + DAY)
    tomorrowMorning.setUTCHours(7, 0, 0, 0)
    const run = dryRun()
    await processStaffDigest(pb, tomorrowMorning, run)

    const digest = run.plan.find((a) => a.kind === 'staff_digest')
    expect(digest).toBeDefined()
    expect(digest && 'count' in digest ? digest.count : 0).toBeGreaterThanOrEqual(1)
  })
})
