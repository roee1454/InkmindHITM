/**
 * Reacts to a freed appointment slot (cancelled or deleted) by looking for a waitlisted
 * customer who'd prefer it, and — if found — proactively starts a new MCP conversation with the
 * relevant staff member proposing the swap. This is the one place in the MCP assistant that
 * creates a `pending` action without a staff-initiated turn; everything downstream (approving
 * the outreach, recording the customer's answer, the final booking approval) goes back through
 * the normal reactive `runMcpTurn` flow.
 *
 * Lives in `mcp-assistant/server` rather than `calendar/server` deliberately — it owns
 * `mcp_conversations`/`mcp_messages`/`mcp_actions` writes (MCP-assistant concepts), and only
 * *reads* calendar helpers (`checkAvailabilityForBot`), matching the existing dependency
 * direction where `tool-servers/calendar.server.ts` already imports from `features/calendar`,
 * never the other way around.
 */
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { checkAvailabilityForBot } from '@/features/calendar/server/bot-appointments'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { createPendingAction } from './approval'
import type { McpActionDiff } from './types'

export interface FreedAppointment {
  id: string
  staff: string | null
  startTime: string
  durationMinutes: number
}

/** Finds the best-matching `watching` waitlist entry for a freed slot, or `null`. Excludes
 *  entries that already have an offer in flight (`offered_appointment` set) so two freed slots
 *  close together can't both get proposed to the same candidate before staff resolves the first. */
async function findWaitlistCandidate(su: Awaited<ReturnType<typeof getSuperuserClient>>, freed: FreedAppointment) {
  if (!freed.staff) return null
  const freedStart = new Date(freed.startTime)

  const entries = await su.collection('waitlist_entries').getFullList({
    filter: `status = "watching" && offered_appointment = "" && (preferred_staff = "" || preferred_staff = "${freed.staff}")`,
    expand: 'current_appointment,customer',
    sort: 'created',
  })

  const candidates = entries.filter((entry) => {
    const appointment = entry.expand?.current_appointment
    if (!appointment) return false
    const currentStart = new Date(appointment.start_time as string)
    if (currentStart <= freedStart) return false // only offer something earlier than what they have
    if (entry.not_before && new Date(entry.not_before as string) > freedStart) return false
    const currentDuration = Number(appointment.duration_minutes) || 120
    if (currentDuration > freed.durationMinutes) return false // their session must fit the freed window
    return true
  })

  // Soonest original appointment first — that candidate is "closest" to this timeframe already.
  candidates.sort((a, b) => {
    const aStart = new Date((a.expand?.current_appointment?.start_time as string) || 0).getTime()
    const bStart = new Date((b.expand?.current_appointment?.start_time as string) || 0).getTime()
    return aStart - bStart
  })

  return candidates[0] || null
}

export async function runWaitlistMatching(freed: FreedAppointment): Promise<void> {
  const su = await getSuperuserClient()
  if (!freed.staff) return // v1 simplification: unassigned appointments aren't matched (see plan §6c)

  const candidate = await findWaitlistCandidate(su, freed)
  if (!candidate) return

  const durationHours = freed.durationMinutes / 60
  const freedStart = new Date(freed.startTime)
  const dateStr = toYmd(freedStart)
  const timeStr = minutesToTime(freedStart.getHours() * 60 + freedStart.getMinutes())
  const availability = await checkAvailabilityForBot(su, {
    staffId: freed.staff,
    date: dateStr,
    timeSlot: timeStr,
    durationHours,
  })
  if (!availability.available) return // slot got taken again before we got here — no offer

  const customer = candidate.expand?.customer
  const currentAppointment = candidate.expand?.current_appointment
  if (!customer || !currentAppointment) return
  const customerName = (customer.name as string) || (customer.phone as string) || 'לקוח'
  const currentStart = new Date(currentAppointment.start_time as string)

  const conversation = await su.collection('mcp_conversations').create({
    staff: freed.staff,
    title: `הצעת מילוי תור — ${customerName}`,
    channel: 'web',
  })

  const messageBody =
    `התפנתה משבצת ב-${dateStr} ${timeStr}. ל${customerName} יש תור קיים ל-` +
    `${toYmd(currentStart)} ${minutesToTime(currentStart.getHours() * 60 + currentStart.getMinutes())} ` +
    `והוא/היא ברשימת ההמתנה למועד מוקדם יותר. רוצה שאפנה אליו/ה בשאלה אם מעוניינ/ת להעביר את התור למועד הפנוי?`

  const message = await su.collection('mcp_messages').create({
    conversation: conversation.id,
    role: 'assistant',
    body: messageBody,
  })

  const diff: McpActionDiff = {
    summary: `הצעת מילוי תור — ${customerName}`,
    rows: [
      {
        label: customerName,
        before: `${toYmd(currentStart)} ${minutesToTime(currentStart.getHours() * 60 + currentStart.getMinutes())}`,
        after: `${dateStr} ${timeStr}`,
      },
    ],
  }

  await createPendingAction({
    conversationId: conversation.id,
    messageId: message.id,
    toolName: 'offer_waitlist_slot',
    args: { waitlistEntryId: candidate.id, freedAppointmentId: freed.id },
    diff,
  })

  await su.collection('waitlist_entries').update(candidate.id, { offered_appointment: freed.id })
  await su.collection('mcp_conversations').update(conversation.id, { last_message_at: new Date().toISOString() })
}
