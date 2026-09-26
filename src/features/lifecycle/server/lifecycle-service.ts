import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import type { RecordModel } from 'pocketbase'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { createWhatsAppClient, WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'
import type { TemplateComponent } from '@/integrations/whatsapp-cloud-api/client'
import { stateAttribution, transition } from '@/features/conversations/server/state-machine'
import { applyConversationAdvance, isConsultation, planConversationAdvance } from '@/features/conversations/server/after-appointment.server'
import { applyReconcileAction, planReconciliation } from '@/features/conversations/server/reconciler.server'
import { logWhatsAppError } from '@/features/settings/server/whatsapp-error-log'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'
import { dispatchMessage, effect } from './lifecycle-run'
import type { LifecyclePlannedAction, LifecycleRunOptions } from './lifecycle-run'
import { processConsultationFollowups, processProjectFeedback, processStaffDigest, processStalledProjects } from './project-lifecycle.server'
import { healingCheckMessage } from '../utils/lifecycle-messages'
import { healingCheckDue } from '../utils/lifecycle-rules'
import { triggerSent, withTriggerSent } from '../utils/triggers'
import type { LifecycleTrigger } from '../utils/triggers'

import { normalizePhoneForWhatsApp } from '@/lib/phone'

export { normalizePhoneForWhatsApp }

const HOUR_MS = 60 * 60 * 1000

export function formatAppointmentDateTime(iso: string) {
  const d = new Date(iso)
  // Formats to Israel local time (Asia/Jerusalem)
  const timeFormatter = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const dateFormatter = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  const dayFormatter = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
  })

  return {
    timeStr: timeFormatter.format(d),
    dateStr: dateFormatter.format(d),
    dayName: dayFormatter.format(d).replace(/^יום\s+/, ''),
  }
}

export async function markTriggerSent(
  su: PocketBase,
  aptId: string,
  currentSent: unknown,
  trigger: LifecycleTrigger,
  nowIso: string,
): Promise<void> {
  await su.collection('appointments').update(aptId, { lifecycle_sent: withTriggerSent(currentSent, trigger, nowIso) })
}

export interface DispatchMessageParams {
  su: PocketBase
  customer: RecordModel
  messageBody: string
  triggerName: string
  templateName?: string
  templateComponents?: TemplateComponent[]
}

export async function dispatchLifecycleMessage({
  su,
  customer,
  messageBody,
  triggerName,
  templateName,
  templateComponents,
}: DispatchMessageParams): Promise<boolean> {
  const phone = customer.phone ? normalizePhoneForWhatsApp(customer.phone) : null
  if (!phone) {
    console.warn(`[lifecycle] Customer ${customer.id} has no valid phone number.`)
    return false
  }

  const nowIso = new Date().toISOString()
  let wamid = `lifecycle_${triggerName}_${Date.now()}`
  let messageType: 'text' | 'template' = 'text'

  const settings = await getWhatsAppSettings()
  if (settings && settings.accessToken && settings.phoneNumberId) {
    try {
      const client = createWhatsAppClient(settings)
      const res = await client.sendText({
        to: phone,
        body: messageBody,
      })
      if (res?.wamid) {
        wamid = res.wamid
      }
    } catch (err: unknown) {
      if (err instanceof WhatsAppApiError && err.code === 131047) {
        // Bug 30: 24-hour customer window closed. Fallback to approved WhatsApp Template.
        console.warn(`[lifecycle] WhatsApp 24h window closed for ${phone}; attempting approved template send...`)
        const effectiveTemplateName = templateName
        if (effectiveTemplateName) {
          try {
            const client = createWhatsAppClient(settings)
            const res = await client.sendTemplate({
              to: phone,
              templateName: effectiveTemplateName,
              languageCode: 'he',
              components: templateComponents ?? [],
            })
            if (res?.wamid) {
              wamid = res.wamid
              messageType = 'template'
            }
          } catch (tplErr: unknown) {
            console.error(`[lifecycle] Template send failed for ${phone}:`, tplErr)
            await logWhatsAppError(
              'webhook_processing',
              `Lifecycle template send failed for ${phone} (${effectiveTemplateName}): ${tplErr instanceof Error ? tplErr.message : String(tplErr)}`,
            )
            await addSystemNotification({
              title: 'שליחת תזכורת בוואטסאפ נכשלה',
              message: `לא ניתן לשלוח תזכורת אוטומטית ללקוח ${customer.name || phone} (חלון 24 שעות נסגר ותבנית נכשלה).`,
              type: 'warning',
              link: `/dashboard/conversations`,
            }).catch(() => null)
            return false
          }
        } else {
          await logWhatsAppError(
            'webhook_processing',
            `WhatsApp 24h window closed for ${phone} and no template configured for ${triggerName}.`,
          )
          await addSystemNotification({
            title: 'שליחת תזכורת נחסמה',
            message: `חלון 24 שעות סגור עבור ${customer.name || phone} ואין תבנית מוגדרת עבור ${triggerName}.`,
            type: 'warning',
            link: `/dashboard/conversations`,
          }).catch(() => null)
          return false
        }
      } else if (err instanceof WhatsAppApiError && err.code === 131030) {
        console.warn(`[lifecycle] Dev mode: recipient ${phone} is not in WhatsApp Cloud API allowed test numbers list. Skipping live send and marking as processed.`)
        // Fall through so the trigger is marked as processed and doesn't loop infinitely every 15 minutes!
      } else {
        console.error(`[lifecycle] WhatsApp send failed for ${phone}:`, err)
        return false
      }
    }
  } else {
    // In dev / test when WhatsApp credentials aren't set, log and proceed with internal record
    console.info(`[lifecycle:dry-run] Would send to ${phone}: ${messageBody.slice(0, 60)}...`)
  }

  // Find or create conversation for message persistence
  let conversation = await su.collection('conversations').getFirstListItem(`customer = "${customer.id}"`).catch(() => null)
  if (!conversation) {
    conversation = await su.collection('conversations').create({
      customer: customer.id,
      state: 'AWAITING_APPOINTMENT',
      ...stateAttribution('system', 'lifecycle_message_to_booked_customer'),
      last_message_at: nowIso,
    }).catch(() => null)
  }

  if (conversation) {
    await su.collection('messages').create({
      conversation: conversation.id,
      whatsapp_message_id: wamid,
      direction: 'outbound',
      sender_type: 'ai_bot',
      type: messageType,
      body: messageBody,
      status: 'sent',
      timestamp: nowIso,
      seen: true,
    }).catch((err) => console.error('[lifecycle] Error saving message record:', err))

    await su.collection('conversations').update(conversation.id, {
      last_message_at: nowIso,
    }).catch(() => null)
  }

  return true
}

/**
 * 1. Reminder 3 Days Before (reminder_3d)
 * Evaluates confirmed appointments between 60h and 84h away.
 */
export async function processReminders3Days(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "confirmed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 60 * HOUR_MS // 60h
  const maxMs = 84 * HOUR_MS // 84h

  for (const apt of appointments) {
    if (triggerSent(apt.lifecycle_sent, 'reminder_3d')) continue

    const startMs = new Date(apt.start_time).getTime()
    const diffMs = startMs - nowMs
    if (diffMs < minMs || diffMs > maxMs) continue

    const customer = apt.expand?.customer as RecordModel | undefined
    if (!customer) continue

    const staffObj = apt.expand?.staff as { name?: string } | undefined
    const artistName = staffObj?.name || 'הסטודיו'
    const typeLabel = apt.type === 'sketch' ? 'לפגישת סקיצה' : 'לקעקוע'
    const { timeStr, dateStr, dayName } = formatAppointmentDateTime(apt.start_time)

    const message = [
      `היי ${customer.name || ''}! מתרגשים לקראת המפגש בעוד 3 ימים! ✨`,
      '',
      `🗓 מתי: יום ${dayName} ה-${dateStr} בשעה ${timeStr} אצל ${artistName}`,
      `🎨 סוג התור: ${typeLabel}`,
      '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!',
      '',
      'אם צריך לעדכן משהו מראש, אנחנו כאן תמיד לכל שאלה.',
    ].join('\n')

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message,
      triggerName: 'reminder_3d',
      templateName: 'appointment_reminder_3d',
      templateComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customer.name || 'לקוח/ה יקר/ה' },
            { type: 'text', text: `${dayName} ה-${dateStr}` },
            { type: 'text', text: timeStr },
            { type: 'text', text: artistName },
          ],
        },
      ],
      onSuccess: { kind: 'appointment_trigger', appointmentId: apt.id, trigger: 'reminder_3d' },
    })
    count++
  }

  return count
}

/**
 * 2. Reminder 1 Day Before (reminder_1d) — Template E
 * Evaluates confirmed appointments between 18h and 30h away.
 */
export async function processReminders1Day(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "confirmed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 18 * HOUR_MS // 18h
  const maxMs = 30 * HOUR_MS // 30h

  for (const apt of appointments) {
    if (triggerSent(apt.lifecycle_sent, 'reminder_1d')) continue

    const startMs = new Date(apt.start_time).getTime()
    const diffMs = startMs - nowMs
    if (diffMs < minMs || diffMs > maxMs) continue

    const customer = apt.expand?.customer as RecordModel | undefined
    if (!customer) continue

    const staffObj = apt.expand?.staff as { name?: string } | undefined
    const artistName = staffObj?.name || 'הסטודיו'
    const typeLabel = apt.type === 'sketch' ? 'לפגישת סקיצה' : 'לקעקוע'
    const { timeStr } = formatAppointmentDateTime(apt.start_time)

    const message = [
      `תזכורת! יש לך תור ${typeLabel} מחר בשעה ${timeStr} אצל ${artistName} 🎉`,
      '',
      '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!',
      '',
      '💡 כמה טיפים חשובים לקראת מחר:',
      '• לאכול ארוחה טובה ולשתות מספיק מים לפני ההגעה.',
      '• לישון טוב בלילה ולהימנע מצריכת אלכוהול וסמים.',
      '• להגיע בבגדים נוחים שמתאימים למיקום הקעקוע.',
      '',
      'יש לאשר שקיבלתם את ההודעה 👍🏽',
      '',
      'כאן לכל שאלה,',
      'צוות אינק מיינד ⚡️',
    ].join('\n')

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message,
      triggerName: 'reminder_1d',
      templateName: 'appointment_reminder_1d',
      templateComponents: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customer.name || 'לקוח/ה יקר/ה' },
            { type: 'text', text: timeStr },
            { type: 'text', text: artistName },
          ],
        },
      ],
      onSuccess: { kind: 'appointment_trigger', appointmentId: apt.id, trigger: 'reminder_1d' },
    })
    count++
  }

  return count
}

/**
 * 4. Healing check (healing_check): during the last week of the healing period after a session
 * (not a consultation or a touch-up). Between sessions, with nothing booked, it also invites
 * booking the next one.
 */
export async function processHealingFollowUp(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}, healingPeriodDays?: number): Promise<number> {
  const healingDays = healingPeriodDays ?? (await loadProjectPolicy(su)).healingPeriodDays
  const appointments = await su.collection('appointments').getFullList({
    filter: su.filter("status = 'completed' && kind = 'session' && start_time >= {:since}", { since: new Date(now.getTime() - (healingDays + 1) * 24 * HOUR_MS) }),
    expand: 'customer,project',
  }).catch(() => [])

  let count = 0
  for (const apt of appointments) {
    if (triggerSent(apt.lifecycle_sent, 'healing_check') || !healingCheckDue(apt.start_time as string, healingDays, now)) continue
    const customer = apt.expand?.customer as RecordModel | undefined
    if (!customer) continue
    const project = apt.expand?.project as RecordModel | undefined
    const nextBooked = project
      ? (await su.collection('appointments').getList(1, 1, {
          filter: su.filter("project = {:p} && (status = 'pending' || status = 'confirmed')", { p: project.id }),
          fields: 'id',
        })).totalItems > 0
      : false
    const message = healingCheckMessage({ name: (customer.name as string) || null, inviteNextSession: project?.stage === 'in_progress' && !nextBooked })

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message.body,
      triggerName: 'healing_check',
      templateName: message.templateName,
      templateComponents: message.templateComponents,
      onSuccess: { kind: 'appointment_trigger', appointmentId: apt.id, trigger: 'healing_check' },
    })
    count++
  }

  return count
}

/**
 * 5. Handle Stalled Conversations
 * 24h gentle nudge if client stopped responding mid-funnel.
 * 20h gentle nudge if client stopped responding mid-funnel (within Meta's 24h window).
 */
export async function processStalledConversations(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const conversations = await su.collection('conversations').getFullList({
    expand: 'customer',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 20 * HOUR_MS // 20h
  const maxMs = 23.5 * HOUR_MS // 23.5h

  for (const conv of conversations) {
    if (conv.is_escalated) continue
    if (
      conv.state !== 'WANTS_TO_BOOK' &&
      conv.state !== 'COLLECTING_INFO' &&
      conv.state !== 'AWAIT_PRICE_OFFER' &&
      conv.state !== 'AWAIT_PAYMENT'
    ) {
      continue
    }

    const rawTattooInfo = (conv.tattoo_info as Record<string, unknown>) || {}
    if (rawTattooInfo.stalled_nudge_sent) continue

    const lastMsgMs = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0
    const ageMs = nowMs - lastMsgMs
    if (ageMs < minMs || ageMs > maxMs) continue

    const customer = conv.expand?.customer as RecordModel | undefined
    if (!customer) continue

    const customerName = customer.name ? ` ${customer.name}` : ''
    const message = `היי${customerName}! ראינו שעצרנו באמצע התיאום. עדיין רלוונטי לבדוק מועדים או להמשיך? נשמח לעזור מאיפה שעצרנו :)`

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message,
      triggerName: 'stalled_nudge',
      onSuccess: { kind: 'stalled_nudge', conversationId: conv.id },
    })
    count++
  }

  return count
}

/**
 * 7. Process Past Confirmed Appointments (>24h after start)
 * - Consultations complete automatically (nothing to enter) and the conversation moves on.
 * - Sessions and touch-ups are closed by staff together with their final price
 *   (src/features/payments/server/close-session.server.ts); the daily staff digest lists the ones
 *   still open (project-lifecycle.server.ts), and the conversation leaves AWAITING_APPOINTMENT on schedule.
 */
export async function processPastConfirmedAppointments(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const threshold = new Date(now.getTime() - 24 * HOUR_MS)
  const pastConfirmed = await su.collection('appointments').getFullList({
    filter: su.filter("status = 'confirmed' && start_time <= {:threshold}", { threshold }),
    expand: 'customer',
  }).catch(() => [])

  let count = 0
  for (const apt of pastConfirmed) {
    if (!isConsultation(apt)) {
      // The conversation moves on once the session's time has passed — the bot must not keep
      // treating it as upcoming while staff haven't entered the final price yet.
      const advance = await planConversationAdvance(su, apt, { upcomingAfter: threshold, reason: 'tattoo_appointment_time_passed' }).catch(() => null)
      if (advance) {
        await effect(options, { kind: 'transition_conversation', ...advance }, () =>
          applyConversationAdvance(su, advance, 'system').catch(() => null),
        )
        count++
      }
      continue
    }

    await effect(options, { kind: 'complete_appointment', appointmentId: apt.id }, () =>
      su.collection('appointments').update(apt.id, statusChange('completed', 'system', 'auto_complete_24h')).catch(() => null),
    )
    count++

    const advance = await planConversationAdvance(su, apt, {
      upcomingAfter: threshold,
      reason: 'sketch_appointment_completed_auto_advance',
    }).catch(() => null)
    if (advance) {
      await effect(options, { kind: 'transition_conversation', ...advance }, () =>
        applyConversationAdvance(su, advance, 'system').catch(() => null),
      )
    }
  }

  return count
}

export const STALE_PENDING_HOURS = 48
// Every step of a booking flow that waits on its hold, the health notice included.
const RELEASABLE_STATES = ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION'] as const

/**
 * 8. Cancel Stale Pending Appointments
 * A pending appointment (awaiting quote/payment/confirmation) that is still pending 48 hours after
 * it was created stops holding its slot, and a conversation stuck waiting on it goes back to
 * collecting info. Used to be a PocketBase cron (pb_hooks/cron.pb.js) running on PocketBase's own
 * clock; it lives here so the whole lifecycle shares one injectable "now" and one test harness.
 */
export async function processStalePendingAppointments(
  su: PocketBase,
  now: Date = new Date(),
  options: LifecycleRunOptions = {},
): Promise<number> {
  const createdBefore = new Date(now.getTime() - STALE_PENDING_HOURS * HOUR_MS)
  const stale = await su.collection('appointments').getFullList({
    filter: su.filter("status = 'pending' && created < {:createdBefore}", { createdBefore }),
    sort: 'created',
  }).catch(() => [])

  for (const apt of stale) {
    await effect(options, { kind: 'cancel_stale_pending', appointmentId: apt.id }, () =>
      su.collection('appointments').update(apt.id, statusChange('cancelled', 'system', 'hold_expired_48h')),
    )
    if (!apt.customer) continue
    const page = await su.collection('conversations').getList(1, 1, {
      filter: su.filter('customer = {:customer}', { customer: apt.customer }),
    })
    const conv = page.items[0]
    if (!conv || !RELEASABLE_STATES.some((state) => state === conv.state)) continue
    const reason = 'stale_pending_appointment_expired_48h'
    await effect(options, { kind: 'transition_conversation', conversationId: conv.id, to: 'COLLECTING_INFO', reason }, () =>
      transition(su, conv.id, 'COLLECTING_INFO', { actor: 'system', reason }).catch(() => null),
    )
  }

  return stale.length
}

/**
 * 9. Reconcile conversation states with the facts (conversations/utils/state-drift.ts).
 * Runs after the other processors, so it sees what they did and never races them for the same
 * conversation; in a dry run, where they didn't act, it skips conversations they already plan to move.
 */
export async function processConversationDrift(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const planned = new Set(
    (options.plan ?? []).flatMap((action) => (action.kind === 'transition_conversation' ? [action.conversationId] : [])),
  )
  const actions = (await planReconciliation(su, now).catch((err: unknown) => {
    console.error('[lifecycle] reconciliation failed:', err)
    return []
  })).filter((action) => !planned.has(action.conversationId))

  for (const action of actions) {
    await effect(
      options,
      { kind: 'reconcile_conversation', conversationId: action.conversationId, from: action.from, to: action.to, reason: action.reason },
      () => applyReconcileAction(su, action),
    ).catch((err: unknown) => console.error(`[lifecycle] reconciling ${action.conversationId} failed:`, err))
  }
  return actions.length
}

export interface LifecycleTickResult {
  reminders3d: number
  reminders1d: number
  healingChecks: number
  stalledNudges: number
  projectFeedback: number
  consultationFollowups: number
  projectsLost: number
  pastCompleted: number
  stalePendingCancelled: number
  staffDigest: number
  reconciled: number
  total: number
  /** Present when the caller asked for the plan (always for dry runs). */
  plan?: LifecyclePlannedAction[]
}

/**
 * Main Tick Engine:
 * Runs all lifecycle processors idempotently. The message counts (reminders, healing checks,
 * stalled nudges, project feedback, consultation follow-ups) are messages *enqueued* onto the
 * conversation-turn BullMQ queue this tick (src/lib/queue/conversation-turn-worker.ts sends them and
 * marks them sent on success) — not confirmed sends. The rest only change records and apply here.
 */
export async function runLifecycleTick(
  su: PocketBase,
  now: Date = new Date(),
  options: LifecycleRunOptions = {},
): Promise<LifecycleTickResult> {
  const run: LifecycleRunOptions = { ...options, plan: options.plan ?? (options.dryRun ? [] : undefined) }
  const policy = await loadProjectPolicy(su)
  const [reminders3d, reminders1d, healingChecks, stalledNudges, projectFeedback, consultationFollowups, projectsLost, pastCompleted, stalePendingCancelled, staffDigest] =
    await Promise.all([
      processReminders3Days(su, now, run),
      processReminders1Day(su, now, run),
      processHealingFollowUp(su, now, run, policy.healingPeriodDays),
      processStalledConversations(su, now, run),
      processProjectFeedback(su, now, run, policy),
      processConsultationFollowups(su, now, run, policy),
      processStalledProjects(su, now, run, policy),
      processPastConfirmedAppointments(su, now, run),
      processStalePendingAppointments(su, now, run),
      processStaffDigest(su, now, run),
    ])
  const reconciled = await processConversationDrift(su, now, run)

  const counts = { reminders3d, reminders1d, healingChecks, stalledNudges, projectFeedback, consultationFollowups, projectsLost, pastCompleted, stalePendingCancelled, staffDigest, reconciled }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0)
  return { ...counts, total, plan: run.plan }
}
