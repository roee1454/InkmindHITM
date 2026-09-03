import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { createWhatsAppClient, WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'

export type LifecycleTrigger =
  | 'reminder_3d'
  | 'reminder_1d'
  | 'aftercare'
  | 'healing_check'

export function normalizePhoneForWhatsApp(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return `972${digits.slice(1)}`
  return digits
}

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

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

  // Get day of week in Israel time
  const dayOfWeekStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'numeric',
  }).format(d)
  const dayIdx = (Number(dayOfWeekStr) || d.getDay()) % 7

  return {
    timeStr: timeFormatter.format(d),
    dateStr: dateFormatter.format(d),
    dayName: HEBREW_DAYS[dayIdx] || 'הקרוב',
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
}

export async function dispatchLifecycleMessage({
  su,
  customer,
  messageBody,
  triggerName,
}: DispatchMessageParams): Promise<boolean> {
  const phone = customer.phone ? normalizePhoneForWhatsApp(customer.phone) : null
  if (!phone) {
    console.warn(`[lifecycle] Customer ${customer.id} has no valid phone number.`)
    return false
  }

  const nowIso = new Date().toISOString()
  let wamid = `lifecycle_${triggerName}_${Date.now()}`

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
        console.warn(`[lifecycle] WhatsApp 24h window closed for ${phone}; cannot send outside window without template.`)
        return false
      }
      console.error(`[lifecycle] WhatsApp send failed for ${phone}:`, err)
      return false
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
      last_message_at: nowIso,
    }).catch(() => null)
  }

  if (conversation) {
    await su.collection('messages').create({
      conversation: conversation.id,
      whatsapp_message_id: wamid,
      direction: 'outbound',
      sender_type: 'ai_bot',
      type: 'text',
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
export async function processReminders3Days(su: PocketBase, now: Date = new Date()): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "confirmed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 60 * 60 * 1000 // 60h
  const maxMs = 84 * 60 * 1000 // 84h

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

    const message = `היי ${customer.name || ''}! מזכירים שיש לך תור ${typeLabel} בעוד 3 ימים (ב-${dayName} ה-${dateStr} בשעה ${timeStr}) אצל ${artistName} ✨
נפגשים ברחוב הדקל 30 שוהם, מתחם שוהם מרקט קומה 1-. חניה בשפע!
אם צריך לעדכן משהו מראש, אנחנו כאן תמיד לכל שאלה.`

    const ok = await dispatchLifecycleMessage({
      su,
      customer,
      staffName: artistName,
      messageBody: message,
      triggerName: 'reminder_3d',
    })

    if (ok) {
      await markTriggerSent(su, apt.id, apt.lifecycle_sent, 'reminder_3d', now.toISOString())
      count++
    }
  }

  return count
}

/**
 * 2. Reminder 1 Day Before (reminder_1d) — Template E
 * Evaluates confirmed appointments between 18h and 30h away.
 */
export async function processReminders1Day(su: PocketBase, now: Date = new Date()): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "confirmed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 18 * 60 * 1000 // 18h
  const maxMs = 30 * 60 * 1000 // 30h

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

    // Template E verbatim
    const message = `תזכורת! יש לך תור ${typeLabel} מחר בשעה ${timeStr} אצל ${artistName}
מיקום רחוב הדקל 30 שוהם במתחם שוהם מרקט קומה מינוס אחת.
חניה בשפע במתחם.
חשוב להקפיד ביום שלפני הקעקוע לאכול ולשתות באופן מסודר, לישון טוב ולהימנע מצריכת אלכוהול וסמים.

יש לאשר שקיבלתם את ההודעה 👍🏽

כאן לכל שאלה,
צוות אינק מיינד ⚡️`

    const ok = await dispatchLifecycleMessage({
      su,
      customer,
      staffName: artistName,
      messageBody: message,
      triggerName: 'reminder_1d',
    })

    if (ok) {
      await markTriggerSent(su, apt.id, apt.lifecycle_sent, 'reminder_1d', now.toISOString())
      count++
    }
  }

  return count
}

/**
 * 3. Post-Session Aftercare & Reviews (aftercare) — Template F
 * Evaluates completed appointments within the last 48 hours.
 */
export async function processPostSessionAftercare(su: PocketBase, now: Date = new Date()): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "completed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const maxAgeMs = 48 * 60 * 60 * 1000 // up to 48 hours after appointment
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

    const ok = await dispatchLifecycleMessage({
      su,
      customer,
      messageBody: message,
      triggerName: 'aftercare',
    })

    if (ok) {
      await markTriggerSent(su, apt.id, apt.lifecycle_sent, 'aftercare', now.toISOString())
      count++
    }
  }

  return count
}

/**
 * 4. Healing Check-in (healing_check)
 * Evaluates completed tattoos 14 to 21 days after appointment date.
 */
export async function processHealingFollowUp(su: PocketBase, now: Date = new Date()): Promise<number> {
  const appointments = await su.collection('appointments').getFullList({
    filter: 'status = "completed"',
    expand: 'customer,staff',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 14 * 24 * 60 * 60 * 1000 // 14 days
  const maxMs = 21 * 24 * 60 * 60 * 1000 // 21 days

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
    const message = `היי${customerName}! עברו כשבועיים מאז הקעקוע שלך בסטודיו שלנו 💫
איך הקעקוע החלים? הכל מרגיש טוב?
נשמח מאוד אם תשלח/י לנו תמונה של התוצאה המוחלמת! וכמובן שאנחנו כאן תמיד לכל שאלה או טאץ'-אפ במידת הצורך :)`

    const ok = await dispatchLifecycleMessage({
      su,
      customer,
      messageBody: message,
      triggerName: 'healing_check',
    })

    if (ok) {
      await markTriggerSent(su, apt.id, apt.lifecycle_sent, 'healing_check', now.toISOString())
      count++
    }
  }

  return count
}

/**
 * 5. Handle Stalled Conversations
 * 24h gentle nudge if client stopped responding mid-funnel.
 */
export async function processStalledConversations(su: PocketBase, now: Date = new Date()): Promise<number> {
  const conversations = await su.collection('conversations').getFullList({
    filter: '(state = "COLLECTING_INFO" || state = "AWAIT_PRICE_OFFER" || state = "AWAIT_PAYMENT") && is_escalated != true',
    expand: 'customer',
  }).catch(() => [])

  let count = 0
  const nowMs = now.getTime()
  const minMs = 24 * 60 * 60 * 1000 // 24h
  const maxMs = 48 * 60 * 60 * 1000 // 48h

  for (const conv of conversations) {
    const rawTattooInfo = (conv.tattoo_info as Record<string, unknown>) || {}
    if (rawTattooInfo.stalled_nudge_sent) continue

    const lastMsgMs = conv.last_message_at ? new Date(conv.last_message_at).getTime() : 0
    const ageMs = nowMs - lastMsgMs
    if (ageMs < minMs || ageMs > maxMs) continue

    const customer = conv.expand?.customer as RecordModel | undefined
    if (!customer) continue

    const customerName = customer.name ? ` ${customer.name}` : ''
    const message = `היי${customerName}! ראינו שעצרנו באמצע התיאום. עדיין רלוונטי לבדוק מועדים או להמשיך? נשמח לעזור מאיפה שעצרנו :)`

    const ok = await dispatchLifecycleMessage({
      su,
      customer,
      messageBody: message,
      triggerName: 'stalled_nudge',
    })

    if (ok) {
      await su.collection('conversations').update(conv.id, {
        tattoo_info: {
          ...rawTattooInfo,
          stalled_nudge_sent: true,
          stalled_nudge_at: now.toISOString(),
        },
      }).catch(() => null)
      count++
    }
  }

  return count
}

export interface LifecycleTickResult {
  reminders3d: number
  reminders1d: number
  aftercare: number
  healingChecks: number
  stalledNudges: number
  total: number
}

/**
 * Main Tick Engine:
 * Runs all lifecycle processors idempotently.
 */
export async function runLifecycleTick(su: PocketBase, now: Date = new Date()): Promise<LifecycleTickResult> {
  const [reminders3d, reminders1d, aftercare, healingChecks, stalledNudges] = await Promise.all([
    processReminders3Days(su, now),
    processReminders1Day(su, now),
    processPostSessionAftercare(su, now),
    processHealingFollowUp(su, now),
    processStalledConversations(su, now),
  ])

  const total = reminders3d + reminders1d + aftercare + healingChecks + stalledNudges
  return {
    reminders3d,
    reminders1d,
    aftercare,
    healingChecks,
    stalledNudges,
    total,
  }
}

