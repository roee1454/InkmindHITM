/**
 * Superuser-context appointment operations for the WhatsApp AI agent. A webhook-triggered
 * bot turn has no staff session, so it cannot call the `requireAuth()`-gated functions in
 * `./appointments.ts` — these are the bot-safe equivalents, scoped to what the tool-calling
 * engine actually needs (read availability, read schedule, create a pending hold).
 */
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'
import { isStudioClosedOn } from '@/features/settings/server/closures'
import { minutesToTime, toYmd } from '@/lib/date-utils'
import { bookingLock } from '@/lib/async-lock'

const ACTIVE_STATUSES = '(status = "pending" || status = "confirmed")'

function slotToRange(date: string, timeSlot: string, durationHours: number) {
  const [year = 2026, month = 1, day = 1] = date.split('-').map(Number)
  const [hour = 0, minute = 0] = timeSlot.split(':').map(Number)
  const start = new Date(year, month - 1, day, hour, minute)
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)
  return { start, end }
}

async function overlapsExistingAppointment(
  su: PocketBase,
  staffId: string,
  date: string,
  timeSlot: string,
  durationHours: number,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const { start, end } = slotToRange(date, timeSlot, durationHours)
  // Widest possible same-day window for the filter; exact overlap is checked in JS below
  // since PocketBase filters can't express "existing.start < newEnd && existing.end > newStart".
  const dayStart = new Date(start)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(start)
  dayEnd.setHours(23, 59, 59, 999)

  const candidates = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${dayStart.toISOString()}" && start_time <= "${dayEnd.toISOString()}"`,
  })

  return candidates.some((item) => {
    if (excludeAppointmentId && item.id === excludeAppointmentId) return false
    const itemStart = new Date(item.start_time as string)
    const itemDuration = Number(item.duration_hours) || 2
    const itemEnd = new Date(itemStart.getTime() + itemDuration * 60 * 60 * 1000)
    return start < itemEnd && end > itemStart
  })
}

/** Anti-hallucination gate: the model must resolve a real staffId via `suggest_artists` before
 *  calling any tool that takes one — never trust a model-supplied id at face value. Ported
 *  from the prior prototype's `STAFF_ID_TOOLS` validation gate. */
async function staffExists(su: PocketBase, staffId: string): Promise<boolean> {
  return su.collection('staff').getOne(staffId).then(() => true).catch(() => false)
}

export interface AvailabilityCheckResult {
  available: boolean
  reason:
    | 'available'
    | 'outside_working_hours'
    | 'slot_taken'
    | 'no_working_hours_configured'
    | 'invalid_staff_id'
    | 'date_in_past'
    | 'studio_closed'
}

/** Past-date gate: the model resolves relative dates ("ראשון הבא") itself, and a
 *  miss-by-a-week lands on a date that already passed — without this gate that slot
 *  reads as available and gets booked silently. Checked before any DB access. */
function slotIsInPast(date: string, timeSlot: string): boolean {
  const { start } = slotToRange(date, timeSlot, 0)
  return start.getTime() <= Date.now()
}

export async function checkAvailabilityForBot(
  su: PocketBase,
  { staffId, date, timeSlot, durationHours }: {
    staffId: string
    date: string
    timeSlot: string
    durationHours: number
  },
): Promise<AvailabilityCheckResult> {
  if (slotIsInPast(date, timeSlot)) return { available: false, reason: 'date_in_past' }
  const closure = await isStudioClosedOn(su, date)
  if (closure.closed) return { available: false, reason: 'studio_closed' }
  if (!(await staffExists(su, staffId))) return { available: false, reason: 'invalid_staff_id' }
  const windows = await getWorkingHoursForStaff(su, staffId)
  if (windows.length === 0) return { available: false, reason: 'no_working_hours_configured' }
  if (!fitsWithinWorkingHours(windows, date, timeSlot, durationHours)) {
    return { available: false, reason: 'outside_working_hours' }
  }
  const taken = await overlapsExistingAppointment(su, staffId, date, timeSlot, durationHours)
  if (taken) return { available: false, reason: 'slot_taken' }
  return { available: true, reason: 'available' }
}

export interface ScheduleEntry {
  date: string
  timeSlot: string
  durationHours: number
  status: string
}

export async function getArtistScheduleForBot(
  su: PocketBase,
  { staffId, fromDate, days }: { staffId: string; fromDate: string; days: number },
): Promise<ScheduleEntry[]> {
  const [year = 2026, month = 1, day = 1] = fromDate.split('-').map(Number)
  const rangeStart = new Date(year, month - 1, day, 0, 0, 0)
  const rangeEnd = new Date(rangeStart.getTime() + days * 24 * 60 * 60 * 1000)

  const records = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${rangeStart.toISOString()}" && start_time < "${rangeEnd.toISOString()}"`,
    sort: 'start_time',
  })

  return records.map((item) => {
    const d = new Date(item.start_time as string)
    return {
      date: toYmd(d),
      timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
      durationHours: Number(item.duration_hours) || 2,
      status: (item.status as string) || 'pending',
    }
  })
}

export interface CreatePendingHoldInput {
  customerId: string
  staffId: string
  date: string
  timeSlot: string
  durationHours: number
  tattooDescription: string
}

export interface CreatePendingHoldResult {
  status: 'created' | 'already_pending' | 'slot_taken' | 'invalid_staff_id' | 'date_in_past' | 'studio_closed'
  appointmentId: string | null
}

/** Creates an idempotent pending hold: re-validates the slot server-side (never trusts the
 *  model's own prior `check_availability` call) and reuses an existing pending hold for the
 *  same customer/staff/slot instead of creating a duplicate on a re-run. */
export async function createPendingHoldForBot(
  su: PocketBase,
  input: CreatePendingHoldInput,
): Promise<CreatePendingHoldResult> {
  const { customerId, staffId, date, timeSlot, durationHours, tattooDescription } = input
  if (slotIsInPast(date, timeSlot)) return { status: 'date_in_past', appointmentId: null }
  const closure = await isStudioClosedOn(su, date)
  if (closure.closed) return { status: 'studio_closed', appointmentId: null }
  if (!(await staffExists(su, staffId))) return { status: 'invalid_staff_id', appointmentId: null }
  const { start } = slotToRange(date, timeSlot, durationHours)

  // Serialized per staff member: without this, two concurrent bot turns (or a bot turn racing
  // a staff-created appointment) could both pass the overlap check below before either writes,
  // double-booking the slot. Different staff members proceed in parallel.
  return bookingLock.runExclusive(staffId, async () => {
    const existingHold = await su.collection('appointments').getFirstListItem(
      `customer = "${customerId}" && staff = "${staffId}" && status = "pending" && source = "ai_bot" && start_time = "${start.toISOString()}"`,
    ).catch(() => null)
    if (existingHold) return { status: 'already_pending' as const, appointmentId: existingHold.id }

    const taken = await overlapsExistingAppointment(su, staffId, date, timeSlot, durationHours)
    if (taken) return { status: 'slot_taken' as const, appointmentId: null }

    const created = await su.collection('appointments').create({
      customer: customerId,
      staff: staffId,
      start_time: start.toISOString(),
      duration_hours: durationHours,
      status: 'pending',
      tattoo_description: tattooDescription,
      source: 'ai_bot',
    })

    // Google Calendar sync is handled by the appointments PocketBase hook
    // (pocketbase/pb_hooks/appointments.pb.js) — not needed here (this hold isn't
    // status='confirmed' yet anyway, so it wouldn't sync regardless).

    return { status: 'created' as const, appointmentId: created.id }
  })
}

/** The customer's currently active (pending/confirmed) appointment, if any — used to resolve
 *  "the appointment" for cancel/reschedule tools without relying on session-carried state that
 *  could go stale. Most-recently-created wins if somehow more than one exists. */
export async function getActiveAppointmentForBot(
  su: PocketBase,
  customerId: string,
): Promise<RecordModel | null> {
  return su.collection('appointments').getFirstListItem(
    `customer = "${customerId}" && ${ACTIVE_STATUSES}`,
    { sort: '-created' },
  ).catch(() => null)
}

/** The customer's most recently completed appointment without a recorded NPS score yet —
 *  used to resolve "the appointment" for `record_nps_score`. */
export async function getCompletedAppointmentAwaitingNpsForBot(
  su: PocketBase,
  customerId: string,
): Promise<RecordModel | null> {
  return su.collection('appointments').getFirstListItem(
    `customer = "${customerId}" && status = "completed" && nps_score = null`,
    { sort: '-start_time' },
  ).catch(() => null)
}

/** Soft-cancels an appointment (status='cancelled', never a DELETE — preserves booking history).
 *  Releasing it from the artist's Google Calendar happens via the appointments PocketBase hook
 *  (pocketbase/pb_hooks/appointments.pb.js) reacting to this update — syncAppointmentToGoogle
 *  already deletes the Google event when status isn't 'confirmed', so no explicit call is
 *  needed here. */
export async function cancelAppointmentForBot(su: PocketBase, appointment: RecordModel): Promise<void> {
  await su.collection('appointments').update(appointment.id, { status: 'cancelled' })
}
