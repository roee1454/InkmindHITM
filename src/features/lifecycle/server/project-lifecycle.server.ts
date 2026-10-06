import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { canTransition, toConversationState, transition } from '@/features/conversations/server/state-machine'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import type { ProjectPolicy } from '@/lib/project-policy'
import { consultationFollowupMessage, npsRequestMessage, reviewRequestMessage } from '../utils/lifecycle-messages'
import { consultationFollowupDue, FEEDBACK_MAX_AGE_DAYS, feedbackDue, staffDigestDue, staleProjectLost } from '../utils/lifecycle-rules'
import { triggerSent, withTriggerSent } from '../utils/triggers'
import type { ProjectLifecycleTrigger } from '../utils/triggers'
import { dispatchMessage, effect } from './lifecycle-run'
import type { LifecycleRunOptions } from './lifecycle-run'

/**
 * The lifecycle steps that belong to a project, not to one appointment (track-b B5): the feedback at
 * the end of the work, the follow-up after a consultation, a project that stopped moving, and the
 * staff's daily list of sessions still waiting to be closed.
 */
const DAY_MS = 24 * 60 * 60 * 1000

async function conversationOf(su: PocketBase, customerId: string): Promise<RecordModel | null> {
  const page = await su.collection('conversations').getList(1, 1, { filter: su.filter('customer = {:c}', { c: customerId }) })
  return page.items[0] ?? null
}

/** A pending or confirmed appointment starting after `from` (any, when omitted). */
async function hasBooked(su: PocketBase, customerId: string, from?: Date): Promise<boolean> {
  const page = await su.collection('appointments').getList(1, 1, {
    filter: su.filter(`customer = {:c} && (status = 'pending' || status = 'confirmed')${from ? ' && start_time > {:from}' : ''}`, { c: customerId, from: from ?? '' }),
    fields: 'id',
  })
  return page.totalItems > 0
}

export async function markProjectTriggerSent(su: PocketBase, projectId: string, trigger: ProjectLifecycleTrigger, nowIso: string): Promise<void> {
  const project = await su.collection('projects').getOne(projectId, { fields: 'lifecycle_sent' })
  await su.collection('projects').update(projectId, { lifecycle_sent: withTriggerSent(project.lifecycle_sent, trigger, nowIso) })
}

/** After the 1–10 question went out: the conversation waits for the answer, about this project. */
export async function awaitFeedbackScore(su: PocketBase, conversationId: string, projectId: string): Promise<void> {
  const conversation = await su.collection('conversations').getOne(conversationId)
  if (!canTransition(toConversationState(conversation.state), 'AWAIT_NPS_SCORE', 'system')) return
  await transition(su, conversationId, 'AWAIT_NPS_SCORE', { actor: 'system', reason: 'project_feedback_requested', extraFields: { active_project: projectId } })
}

async function studioIdentity(su: PocketBase): Promise<{ studioName: string; googleReviewLink: string | null }> {
  const settings = (await su.collection('settings').getList(1, 1).catch(() => null))?.items[0]
  return {
    studioName: (settings?.studio_name as string | undefined)?.trim() || 'הסטודיו',
    googleReviewLink: (settings?.google_review_link as string | undefined)?.trim() || null,
  }
}

/**
 * B5.5: once per project, a few hours after it's completed — the 1–10 question when the studio asks
 * for a score first (and the customer isn't in the middle of another booking), the review links
 * otherwise. Replaces the review request that went out after every session, consultations included.
 */
export async function processProjectFeedback(su: PocketBase, now: Date, options: LifecycleRunOptions = {}, policy?: ProjectPolicy): Promise<number> {
  const { postProjectFeedback, easyReviewLink } = policy ?? (await loadProjectPolicy(su))
  const projects = await su.collection('projects').getFullList({
    filter: su.filter("stage = 'completed' && completed_at >= {:since}", { since: new Date(now.getTime() - FEEDBACK_MAX_AGE_DAYS * DAY_MS) }),
    expand: 'customer',
  }).catch(() => [])
  const identity = await studioIdentity(su)

  let count = 0
  for (const project of projects) {
    if (triggerSent(project.lifecycle_sent, 'feedback') || !feedbackDue((project.completed_at as string) || null, now)) continue
    const customer = project.expand?.customer as RecordModel | undefined
    if (!customer) continue
    const conversation = await conversationOf(su, customer.id)
    const askScore =
      postProjectFeedback === 'nps_then_review' && (!conversation || canTransition(toConversationState(conversation.state), 'AWAIT_NPS_SCORE', 'system'))
    const message = askScore
      ? npsRequestMessage({ name: (customer.name as string) || null, studioName: identity.studioName })
      : reviewRequestMessage({ name: (customer.name as string) || null, ...identity, easyReviewLink })
    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message.body,
      triggerName: askScore ? 'nps_request' : 'review_request',
      templateName: message.templateName,
      templateComponents: message.templateComponents,
      onSuccess: { kind: 'project_trigger', projectId: project.id, trigger: 'feedback', awaitScore: askScore },
    })
    count++
  }
  return count
}

/** B5.3: a few days after a consultation with nothing booked, one friendly follow-up. */
export async function processConsultationFollowups(su: PocketBase, now: Date, options: LifecycleRunOptions = {}, policy?: ProjectPolicy): Promise<number> {
  const { consultationFollowupDays, consultationLostAfterDays } = policy ?? (await loadProjectPolicy(su))
  const projects = await su.collection('projects').getFullList({ filter: "stage = 'consultation_done'", expand: 'customer,primary_staff' }).catch(() => [])

  let count = 0
  for (const project of projects) {
    if (triggerSent(project.lifecycle_sent, 'consultation_followup')) continue
    const customer = project.expand?.customer as RecordModel | undefined
    if (!customer) continue
    const conversation = await conversationOf(su, customer.id)
    const due = consultationFollowupDue({
      stageChangedAt: (project.stage_changed_at as string) || null,
      followupDays: consultationFollowupDays,
      lostAfterDays: consultationLostAfterDays,
      conversationState: (conversation?.state as string | undefined) ?? null,
      hasUpcoming: await hasBooked(su, customer.id, now),
      now,
    })
    if (!due) continue
    const artist = project.expand?.primary_staff as RecordModel | undefined
    const message = consultationFollowupMessage({ name: (customer.name as string) || null, artistName: (artist?.name as string) || null })
    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message.body,
      triggerName: 'consultation_followup',
      templateName: message.templateName,
      templateComponents: message.templateComponents,
      onSuccess: { kind: 'project_trigger', projectId: project.id, trigger: 'consultation_followup' },
    })
    count++
  }
  return count
}

/** Conversation states a lost project closes: the bot was booking it. */
const CLOSES_WITH_PROJECT = ['NEW', 'WANTS_TO_BOOK', 'COLLECTING_INFO', 'AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION', 'AWAITING_APPOINTMENT']

/**
 * B5.4: a project that stopped moving is lost for lack of response, so the funnel knows why
 * customers didn't go on, and the conversation that was booking it closes. Replaces the 7-day lead
 * expiry, which only closed the conversation.
 */
export async function processStalledProjects(su: PocketBase, now: Date, options: LifecycleRunOptions = {}, policy?: ProjectPolicy): Promise<number> {
  const { inquiryLostAfterDays, consultationLostAfterDays } = policy ?? (await loadProjectPolicy(su))
  const projects = await su.collection('projects').getFullList({
    filter: "stage = 'inquiry' || stage = 'quoted' || stage = 'consultation_done'",
  }).catch(() => [])

  let count = 0
  for (const project of projects) {
    const customerId = project.customer as string
    const conversation = await conversationOf(su, customerId)
    const watching = await su.collection('waitlist_entries').getList(1, 1, {
      filter: su.filter("customer = {:c} && status = 'watching'", { c: customerId }),
      fields: 'id',
    }).catch(() => ({ totalItems: 0 }))
    const lost = staleProjectLost({
      stage: project.stage as string,
      stageChangedAt: (project.stage_changed_at as string) || null,
      lastMessageAt: (conversation?.last_message_at as string | undefined) ?? null,
      inquiryLostAfterDays,
      consultationLostAfterDays,
      // A lost project can't keep appointments (pb_hooks/lib/project-stage.js), so any booking counts.
      hasUpcoming: await hasBooked(su, customerId),
      onWaitlist: conversation?.state === 'WAITLIST' || watching.totalItems > 0,
      now,
    })
    if (!lost) continue

    await effect(options, { kind: 'mark_project_lost', projectId: project.id, reason: 'no_response' }, () =>
      su.collection('projects').update(project.id, { lost_at: now.toISOString(), lost_reason: 'no_response', stage_actor: 'system', stage_reason: 'no_response_timeout' }),
    ).catch((err: unknown) => console.error(`[lifecycle] marking project ${project.id} lost failed:`, err))
    count++

    if (conversation && conversation.active_project === project.id && CLOSES_WITH_PROJECT.includes(conversation.state as string)) {
      const reason = 'project_lost_no_response'
      await effect(options, { kind: 'transition_conversation', conversationId: conversation.id, to: 'COMPLETED', reason }, () =>
        transition(su, conversation.id, 'COMPLETED', { actor: 'system', reason, extraFields: { status: 'closed' } }).catch(() => null),
      )
    }
  }
  return count
}

export const STAFF_DIGEST_TITLE = 'סשנים שממתינים לסגירה'

/**
 * B5.6: once a day, one notification with every session still waiting to be closed a day after it
 * started — income isn't lost because someone forgot. Replaces the single reminder per session,
 * after which an unclosed session was forgotten.
 */
export async function processStaffDigest(su: PocketBase, now: Date, options: LifecycleRunOptions = {}): Promise<number> {
  const last = await su.collection('notifications').getList(1, 1, { filter: su.filter('title = {:t}', { t: STAFF_DIGEST_TITLE }), sort: '-created' }).catch(() => null)
  if (!staffDigestDue(now, (last?.items[0]?.created as string | undefined) ?? null)) return 0

  const unclosed = await su.collection('appointments').getFullList({
    filter: su.filter("status = 'confirmed' && kind != 'consultation' && start_time <= {:before}", { before: new Date(now.getTime() - DAY_MS) }),
    sort: 'start_time',
    expand: 'customer',
  }).catch(() => [])
  if (unclosed.length === 0) return 0

  const lines = unclosed.slice(0, 10).map((apt) => {
    const name = (apt.expand?.customer?.name as string | undefined) || 'לקוח'
    return `• ${name} (${new Date(apt.start_time as string).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' })})`
  })
  const more = unclosed.length > 10 ? `\nועוד ${unclosed.length - 10}.` : ''
  await effect(options, { kind: 'staff_digest', count: unclosed.length }, () =>
    addSystemNotification({
      title: STAFF_DIGEST_TITLE,
      message: `${unclosed.length} סשנים הסתיימו ועדיין לא נסגרו עם מחיר סופי:\n${lines.join('\n')}${more}`,
      type: 'warning',
      link: '/dashboard/calendar',
    }),
  )
  return 1
}
