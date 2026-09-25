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
import { enqueueLifecycleMessage } from '@/lib/queue/conversation-turn-queue'
import type { LifecycleMessageJobData } from '@/lib/queue/conversation-turn-queue'

import { normalizePhoneForWhatsApp } from '@/lib/phone'

export const LIFECYCLE_TEMPLATE_MAP: Record<string, string> = {
  reminder_3d: 'appointment_reminder_3d',
  reminder_1d: 'appointment_reminder_1d',
  aftercare: 'aftercare_check',
  healing_check: 'aftercare_check',
}

export type LifecycleTrigger =
  | 'reminder_3d'
  | 'reminder_1d'
  | 'aftercare'
  | 'healing_check'
  | 'close_out_reminder'
export { normalizePhoneForWhatsApp }

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Everything a tick would do, as data. A dry run (see lifecycle-simulation.ts) collects these
 * instead of acting, which is how lifecycle timing is tested at any simulated "now" without
 * moving the machine's clock — moving it poisons every timestamp and cache written meanwhile.
 */
export type LifecyclePlannedAction =
  | { kind: 'message'; trigger: string; customerId: string; body: string; target: LifecycleMessageJobData['onSuccess'] }
  | { kind: 'complete_appointment'; appointmentId: string }
  | { kind: 'remind_close_out'; appointmentId: string }
  | { kind: 'cancel_stale_pending'; appointmentId: string }
  | { kind: 'expire_lead'; customerId: string }
  | { kind: 'transition_conversation'; conversationId: string; to: string; reason: string }
  | { kind: 'reconcile_conversation'; conversationId: string; from: string; to: string | null; reason: string }

export interface LifecycleRunOptions {
  /** Record the plan without sending messages or writing records. */
  dryRun?: boolean
  /** When set, every action (dry or real) is appended here. */
  plan?: LifecyclePlannedAction[]
}

/** Runs one side effect, or in a dry run only records it. */
async function effect(options: LifecycleRunOptions, action: LifecyclePlannedAction, apply: () => Promise<unknown>): Promise<void> {
  options.plan?.push(action)
  if (!options.dryRun) await apply()
}

function dispatchMessage(options: LifecycleRunOptions, job: LifecycleMessageJobData): Promise<void> {
  return effect(
    options,
    { kind: 'message', trigger: job.triggerName, customerId: job.customerId, body: job.messageBody, target: job.onSuccess },
    () => enqueueLifecycleMessage(job),
  )
}

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

export function hasTriggerBeenSent(apt: RecordModel, trigger: LifecycleTrigger): boolean {
  const sent = Array.isArray(apt.lifecycle_sent) ? apt.lifecycle_sent : []
  return sent.some((item: unknown) => {
    if (typeof item === 'string') return item === trigger
    if (item && typeof item === 'object' && 'trigger' in item) {
      return (item as { trigger: string }).trigger === trigger
    }
    return false
  })
}

export async function markTriggerSent(
  su: PocketBase,
  aptId: string,
  currentSent: unknown,
  trigger: LifecycleTrigger,
  nowIso: string,
): Promise<void> {
  const list = Array.isArray(currentSent) ? [...currentSent] : []
  list.push({ trigger, sent_at: nowIso })
  await su.collection('appointments').update(aptId, {
    lifecycle_sent: list,
  })
}

export interface DispatchMessageParams {
  su: PocketBase
  customer: RecordModel
  staffName?: string
  messageBody: string
  triggerName: string
  templateName?: string
  templateComponents?: TemplateComponent[]
}

export async function dispatchLifecycleMessage({
  su,
  customer,
  staffName,
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
        const effectiveTemplateName = templateName ?? LIFECYCLE_TEMPLATE_MAP[triggerName]
        if (effectiveTemplateName) {
          try {
            const client = createWhatsAppClient(settings)
            const res = await client.sendTemplate({
              to: phone,
              templateName: effectiveTemplateName,
              languageCode: 'he',
              components: templateComponents ?? [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: customer.name || 'לקוח/ה יקר/ה' },
                    { type: 'text', text: staffName || 'הסטודיו' },
                  ],
                },
              ],
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
    if (hasTriggerBeenSent(apt, 'reminder_3d')) continue

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
      staffName: artistName,
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
    if (hasTriggerBeenSent(apt, 'reminder_1d')) continue

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
      staffName: artistName,
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
 * 3. Post-Session Aftercare & Reviews (aftercare) — Template F
 * Evaluates completed appointments within the last 48 hours.
 */
export async function processPostSessionAftercare(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "completed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const maxAgeMs = 48 * HOUR_MS // up to 48 hours after appointment
  const minAgeMs = 30 * 60 * 1000 // wait at least 30 mins after appointment end

  for (const apt of appointments) {
    if (hasTriggerBeenSent(apt, 'aftercare')) continue

    const startMs = new Date(apt.start_time).getTime()
    const durationMs = (Number(apt.duration_minutes) || 120) * 60 * 1000
    const endMs = startMs + durationMs

    const ageMs = nowMs - endMs
    if (ageMs < minAgeMs || ageMs > maxAgeMs) continue

    const customer = apt.expand?.customer as RecordModel | undefined
    if (!customer) continue

    // Template F verbatim
    const message = `תודה רבה שבחרת בסטודיו שלנו השבוע ! 💫
נשמח אם תשתפו אותנו בחוויה שלכם ותעזרו לנו להשתפר ולהגיע ללקוחות חדשים.
לחוות דעת בגוגל לחצו כאן: https://g.co/kgs/HUr9g2G
ולאיזי כאן: https://easy.co.il/page/10068219?utm_medium=social&utm_source=easy_app&utm_campaign=bizpage_header_share

תודה על הזמן והפרגון,
מצפים לראות אתכם שוב!
צוות ink mind tattoo`

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message,
      triggerName: 'aftercare',
      onSuccess: { kind: 'appointment_trigger', appointmentId: apt.id, trigger: 'aftercare' },
    })
    count++
  }

  return count
}

/**
 * 4. Healing Check-in (healing_check)
 * Evaluates completed tattoos 14 to 21 days after appointment date.
 */
export async function processHealingFollowUp(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "completed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 14 * DAY_MS // 14 days
  const maxMs = 21 * DAY_MS // 21 days

  for (const apt of appointments) {
    // Only check tattoos, not sketch consults
    if (apt.type === 'sketch') continue
    if (hasTriggerBeenSent(apt, 'healing_check')) continue

    const startMs = new Date(apt.start_time).getTime()
    const ageMs = nowMs - startMs
    if (ageMs < minMs || ageMs > maxMs) continue

    const customer = apt.expand?.customer as RecordModel | undefined
    if (!customer) continue

    const customerName = customer.name ? ` ${customer.name}` : ''
    const message = [
      `היי${customerName}! עברו כשבועיים מאז הקעקוע שלך בסטודיו שלנו 💫`,
      '',
      'איך הקעקוע החלים? הכל מרגיש רגוע וטוב?',
      'נשמח בטירוף אם תשלח/י לנו תמונה של התוצאה המוחלמת ✨',
      "וכמובן שאנחנו כאן תמיד לכל שאלה או טאץ'-אפ במידת הצורך :)",
    ].join('\n')

    await dispatchMessage(options, {
      customerId: customer.id,
      messageBody: message,
      triggerName: 'healing_check',
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

export const LEAD_INACTIVITY_EXPIRY_DAYS = 7

/**
 * 6. Process Expired Inactive Leads
 * Closes leads inactive for 7 days with no future appointments and marks them expired.
 */
export async function processExpiredLeads(su: PocketBase, now: Date = new Date(), options: LifecycleRunOptions = {}): Promise<number> {
  const expiryMs = LEAD_INACTIVITY_EXPIRY_DAYS * DAY_MS
  const nowMs = now.getTime()

  const customers = await su.collection('customers').getFullList({
    filter: 'lead_stage != "COMPLETED" && lead_stage != "AWAITING_APPOINTMENT"',
  }).catch(() => [])

  let count = 0
  for (const customer of customers) {
    // Check if customer has any active or future appointments
    const activeAppts = await su.collection('appointments').getList(1, 1, {
      filter: `customer = "${customer.id}" && (status = "confirmed" || status = "pending")`,
    }).catch(() => ({ totalItems: 0 }))

    if (activeAppts.totalItems > 0) continue

    const conv = await su.collection('conversations').getFirstListItem(`customer = "${customer.id}"`).catch(() => null)
    const lastActivityStr = (conv?.last_message_at || customer.updated || customer.created) as string
    const lastActivityMs = new Date(lastActivityStr).getTime()

    if (nowMs - lastActivityMs >= expiryMs) {
      await effect(options, { kind: 'expire_lead', customerId: customer.id }, () =>
        su.collection('customers').update(customer.id, { lead_stage: 'COMPLETED' }).catch(() => null),
      )
      if (conv && conv.state !== 'COMPLETED') {
        await effect(
          options,
          { kind: 'transition_conversation', conversationId: conv.id, to: 'COMPLETED', reason: 'lead_inactivity_expiry_7d' },
          () =>
            transition(su, conv.id, 'COMPLETED', {
              actor: 'system',
              reason: 'lead_inactivity_expiry_7d',
              extraFields: { status: 'closed' },
            }).catch(() => null),
        )
      }
      count++
    }
  }

  return count
}

/**
 * 7. Process Past Confirmed Appointments (>24h after start)
 * - Consultations complete automatically (nothing to enter) and the conversation moves on.
 * - Sessions and touch-ups are closed by staff together with their final price
 *   (src/features/payments/server/close-session.server.ts); staff get one reminder instead, and the
 *   conversation still leaves AWAITING_APPOINTMENT on schedule.
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
      }

      if (hasTriggerBeenSent(apt, 'close_out_reminder')) continue
      const customerName = (apt.expand?.customer?.name as string) || 'לקוח'
      const { dateStr } = formatAppointmentDateTime(apt.start_time as string)
      // One failing reminder must not stop the rest of the tick.
      await effect(options, { kind: 'remind_close_out', appointmentId: apt.id }, async () => {
        await addSystemNotification({
          title: 'סשן ממתין לסגירה',
          message: `הסשן של ${customerName} מ-${dateStr} הסתיים. יש להזין מחיר סופי ולסגור אותו ביומן.`,
          type: 'warning',
          link: '/dashboard/calendar',
        })
        await markTriggerSent(su, apt.id, apt.lifecycle_sent, 'close_out_reminder', now.toISOString())
      }).catch((err: unknown) => console.error(`[lifecycle] close-out reminder for ${apt.id} failed:`, err))
      count++
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
  aftercare: number
  healingChecks: number
  stalledNudges: number
  expiredLeads: number
  pastCompleted: number
  stalePendingCancelled: number
  reconciled: number
  total: number
  /** Present when the caller asked for the plan (always for dry runs). */
  plan?: LifecyclePlannedAction[]
}

/**
 * Main Tick Engine:
 * Runs all lifecycle processors idempotently. `reminders3d/1d`, `aftercare`, `healingChecks`
 * and `stalledNudges` count messages *enqueued* onto the conversation-turn BullMQ queue this
 * tick (src/lib/queue/conversation-turn-worker.ts actually sends them and marks the trigger
 * sent on success) — not confirmed sends. `expiredLeads`/`pastCompleted` are still applied
 * synchronously here since they only mutate records, no WhatsApp send involved.
 */
export async function runLifecycleTick(
  su: PocketBase,
  now: Date = new Date(),
  options: LifecycleRunOptions = {},
): Promise<LifecycleTickResult> {
  const run: LifecycleRunOptions = { ...options, plan: options.plan ?? (options.dryRun ? [] : undefined) }
  const [reminders3d, reminders1d, aftercare, healingChecks, stalledNudges, expiredLeads, pastCompleted, stalePendingCancelled] =
    await Promise.all([
      processReminders3Days(su, now, run),
      processReminders1Day(su, now, run),
      processPostSessionAftercare(su, now, run),
      processHealingFollowUp(su, now, run),
      processStalledConversations(su, now, run),
      processExpiredLeads(su, now, run),
      processPastConfirmedAppointments(su, now, run),
      processStalePendingAppointments(su, now, run),
    ])
  const reconciled = await processConversationDrift(su, now, run)

  const total =
    reminders3d + reminders1d + aftercare + healingChecks + stalledNudges + expiredLeads + pastCompleted + stalePendingCancelled + reconciled
  return {
    reminders3d,
    reminders1d,
    aftercare,
    healingChecks,
    stalledNudges,
    expiredLeads,
    pastCompleted,
    stalePendingCancelled,
    reconciled,
    total,
    plan: run.plan,
  }
}

