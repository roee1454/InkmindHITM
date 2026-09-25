/**
 * Superuser-context appointment operations for the WhatsApp AI agent. A webhook-triggered
 * bot turn has no staff session, so it cannot call the `requireAuth()`-gated functions in
 * `./appointments.ts` — these are the bot-safe equivalents, scoped to what the tool-calling
 * engine actually needs (read availability, read schedule, create a pending hold).
 */
import type PocketBase from 'pocketbase'
import { statusChange } from '../utils/appointment-transitions'
import type { CancelledBy, StatusActor } from '../utils/appointment-transitions'
import type { RecordModel } from 'pocketbase'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'
import { isStudioClosedOn } from '@/features/settings/server/closures'
import { addDays, fromYmd, minutesToTime, toYmd } from '@/lib/date-utils'
import { bookingLock } from '@/lib/async-lock'
import { syncAppointmentToGoogle } from '@/integrations/google-calendar/server/google-sync.server'
import {
  getGoogleCalendarBusyIntervals,
  getGoogleCalendarEvents,
  filterGoogleBusyIntervalsForDay,
} from '@/integrations/google-calendar/server/google-auth.server'
import { runWaitlistMatching } from '@/features/mcp-assistant/server/waitlist-matcher'
import {
  
  calculateFreeIntervals,
  findFittingSlots,
  checkSlotAvailability,
  timeStringToMinutes
} from '@/lib/time-intervals'
import type {TimeInterval} from '@/lib/time-intervals';
import { titleInquiryProject } from '@/features/projects/server/inquiry-project.server'

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
  const dayStart = new Date(start)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(start)
  dayEnd.setHours(23, 59, 59, 999)

  const candidates = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${dayStart.toISOString()}" && start_time <= "${dayEnd.toISOString()}"`,
  })

  const overlapsDb = candidates.some((item) => {
    if (excludeAppointmentId && item.id === excludeAppointmentId) return false
    const itemStart = new Date(item.start_time as string)
    const itemDuration = (Number(item.duration_minutes) || 120) / 60
    const itemEnd = new Date(itemStart.getTime() + itemDuration * 60 * 60 * 1000)
    return start < itemEnd && end > itemStart
  })

  if (overlapsDb) return true

  // Bug 24: Check personal events in Google Calendar
  const knownGoogleEventIds = new Set(candidates.map((c) => c.google_event_id as string).filter(Boolean))
  const googleBusy = await getGoogleCalendarBusyIntervals(staffId, date, knownGoogleEventIds).catch(() => [])
  const reqStartMins = timeStringToMinutes(timeSlot)
  const reqEndMins = reqStartMins + Math.round(durationHours * 60)

  return googleBusy.some((b) => reqStartMins < b.end && reqEndMins > b.start)
}

/** Anti-hallucination gate: the model must resolve a real staffId via `suggest_artists` before
 *  calling any tool that takes one — never trust a model-supplied id at face value. */
async function staffExists(su: PocketBase, staffId: string): Promise<boolean> {
  return su.collection('staff').getOne(staffId).then(() => true).catch(() => false)
}

export interface AvailabilityCheckResult {
  available: boolean
  isException?: boolean
  reason:
    | 'available'
    | 'outside_working_hours'
    | 'slot_taken'
    | 'no_working_hours_configured'
    | 'invalid_staff_id'
    | 'date_in_past'
    | 'studio_closed'
  suggestedPhrasing?: string
  alternativeSlots?: string[]
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
  {
    staffId,
    date,
    timeSlot,
    durationHours,
    allowException = false,
  }: {
    staffId: string
    date: string
    timeSlot: string
    durationHours: number
    allowException?: boolean
  },
): Promise<AvailabilityCheckResult> {
  if (slotIsInPast(date, timeSlot)) return { available: false, reason: 'date_in_past' }
  const closure = await isStudioClosedOn(su, date)
  if (closure.closed) return { available: false, reason: 'studio_closed' }
  if (!(await staffExists(su, staffId))) return { available: false, reason: 'invalid_staff_id' }

  // If staff explicitly approved an exception in the chat, bypass schedule restrictions!
  if (allowException) {
    return {
      available: true,
      isException: true,
      reason: 'available',
      suggestedPhrasing: 'המשבצת אושרה כחריגה על פי הנחיית הצוות בשיחה.',
    }
  }

  const windows = await getWorkingHoursForStaff(su, staffId)
  if (windows.length === 0) return { available: false, reason: 'no_working_hours_configured' }

  const [year = 2026, month = 1, day = 1] = date.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()
  const dayWindows: TimeInterval[] = windows
    .filter((w) => w.dayOfWeek === dayOfWeek)
    .map((w) => ({
      start: timeStringToMinutes(w.startTime),
      end: timeStringToMinutes(w.endTime),
    }))

  if (dayWindows.length === 0) {
    const alternativeSlots = await getAlternativeSlots(su, staffId, date, durationHours)
    return { available: false, reason: 'outside_working_hours', alternativeSlots }
  }

  const { start } = slotToRange(date, timeSlot, durationHours)
  const dayStart = new Date(start)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(start)
  dayEnd.setHours(23, 59, 59, 999)

  const appointments = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${dayStart.toISOString()}" && start_time <= "${dayEnd.toISOString()}"`,
  })

  const busyIntervals: TimeInterval[] = appointments.map((appt) => {
    const apptStart = new Date(appt.start_time as string)
    const durMins = Number(appt.duration_minutes) || 120
    const startMins = apptStart.getHours() * 60 + apptStart.getMinutes()
    return {
      start: startMins,
      end: startMins + durMins,
    }
  })

  // Bug 24: Fetch and merge personal events from Google Calendar
  const knownGoogleEventIds = new Set(appointments.map((a) => a.google_event_id as string).filter(Boolean))
  const googleBusy = await getGoogleCalendarBusyIntervals(staffId, date, knownGoogleEventIds).catch(() => [])
  busyIntervals.push(...googleBusy)

  const freeIntervals = calculateFreeIntervals(dayWindows, busyIntervals)
  const reqStartMins = timeStringToMinutes(timeSlot)
  const reqDurMins = Math.round(durationHours * 60)
  const availability = checkSlotAvailability(freeIntervals, reqStartMins, reqDurMins)

  if (!availability.available) {
    const alternativeSlots = await getAlternativeSlots(su, staffId, date, durationHours)
    // Check if it's within working hours bounds or colliding with another appointment
    const isWithinWorkHours = dayWindows.some((w) => reqStartMins >= w.start && reqStartMins + reqDurMins <= w.end)
    const reason = isWithinWorkHours ? 'slot_taken' : 'outside_working_hours'
    return { available: false, reason, alternativeSlots }
  }

  return {
    available: true,
    reason: 'available',
  }
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
  const startDate = fromYmd(fromDate)
  const endDate = addDays(startDate, days)
  endDate.setHours(23, 59, 59, 999)

  const records = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${startDate.toISOString()}" && start_time <= "${endDate.toISOString()}"`,
    sort: 'start_time',
  })

  return records.map((item) => {
    const d = new Date(item.start_time as string)
    return {
      date: toYmd(d),
      timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
      durationHours: (Number(item.duration_minutes) || 120) / 60,
      status: (item.status as string) || 'pending',
    }
  })
}

export interface AvailableDaySlots {
  date: string
  dayOfWeek: string
  availableSlots: string[]
  recommendedSlots: string[]
  summaryHebrew: string
  isEntireDayFree?: boolean
  workingHoursRange?: string
}

export interface AvailableSlotsResult {
  artistName: string
  durationHours: number
  availableDays: AvailableDaySlots[]
  readyToUseProposal: string
  totalSlotsFound: number
  bookedAppointments: ScheduleEntry[]
  workingHours: Array<{ day: string; startTime: string; endTime: string }>
}

export async function getAvailableSlotsForBot(
  su: PocketBase,
  {
    staffId,
    fromDate,
    days = 7,
    durationHours = 2,
    stepMinutes = 30,
  }: {
    staffId: string
    fromDate: string
    days?: number
    durationHours?: number
    stepMinutes?: number
  },
): Promise<AvailableSlotsResult> {
  const staff = await su.collection('staff').getOne(staffId).catch(() => null)
  const artistName = (staff?.name as string) || 'המקעקע'

  const windows = await getWorkingHoursForStaff(su, staffId)

  const DAYS_HEBREW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
  const formattedHours = windows.map((w) => ({
    day: DAYS_HEBREW[w.dayOfWeek] || String(w.dayOfWeek),
    startTime: w.startTime,
    endTime: w.endTime,
  }))

  if (!staff || windows.length === 0) {
    return {
      artistName,
      durationHours,
      availableDays: [],
      readyToUseProposal: !staff ? 'מזהה אמן לא תקין.' : 'לא הוגדרו שעות עבודה לאמן זה.',
      totalSlotsFound: 0,
      bookedAppointments: [],
      workingHours: formattedHours,
    }
  }

  const startDate = fromYmd(fromDate)
  const endDate = addDays(startDate, days)
  endDate.setHours(23, 59, 59, 999)

  const records = await su.collection('appointments').getFullList({
    filter: `staff = "${staffId}" && ${ACTIVE_STATUSES} && start_time >= "${startDate.toISOString()}" && start_time <= "${endDate.toISOString()}"`,
    sort: 'start_time',
  })

  // Bug 24: Single batch fetch for Google Calendar events across the date range
  const knownGoogleEventIds = new Set(records.map((r) => r.google_event_id as string).filter(Boolean))
  const googleEvents = await getGoogleCalendarEvents(staffId, startDate.toISOString(), endDate.toISOString()).catch(() => [])


  const bookedAppointments: ScheduleEntry[] = records.map((item) => {
    const d = new Date(item.start_time as string)
    return {
      date: toYmd(d),
      timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
      durationHours: (Number(item.duration_minutes) || 120) / 60,
      status: (item.status as string) || 'pending',
    }
  })

  const availableDays: AvailableDaySlots[] = []
  const todayStr = toYmd(new Date())
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
  const durationMins = Math.round(durationHours * 60)

  for (let d = 0; d < days; d++) {
    const curDate = addDays(startDate, d)
    const dateStr = toYmd(curDate)
    const dayOfWeekIdx = curDate.getDay()
    const dayName = DAYS_HEBREW[dayOfWeekIdx] || 'לא ידוע'

    if (dateStr < todayStr) continue

    const closure = await isStudioClosedOn(su, dateStr)
    if (closure.closed) continue

    const dayWindows: TimeInterval[] = windows
      .filter((w) => w.dayOfWeek === dayOfWeekIdx)
      .map((w) => ({
        start: timeStringToMinutes(w.startTime),
        end: timeStringToMinutes(w.endTime),
      }))

    if (dayWindows.length === 0) continue

    const busyIntervals: TimeInterval[] = records
      .filter((r) => toYmd(new Date(r.start_time as string)) === dateStr)
      .map((r) => {
        const start = new Date(r.start_time as string)
        const dur = Number(r.duration_minutes) || 120
        const startMins = start.getHours() * 60 + start.getMinutes()
        return { start: startMins, end: startMins + dur }
      })

    // Bug 24: Merge personal Google Calendar events for this day
    const googleBusy = filterGoogleBusyIntervalsForDay(googleEvents, dateStr, knownGoogleEventIds)
    busyIntervals.push(...googleBusy)

    const freeIntervals = calculateFreeIntervals(dayWindows, busyIntervals)
    let daySlots = findFittingSlots(freeIntervals, durationMins, stepMinutes)

    // Filter out past hours if checking today
    if (dateStr === todayStr) {
      daySlots = daySlots.filter((slot) => timeStringToMinutes(slot) > nowMins + 30)
    }

    if (daySlots.length === 0) continue

    const isEntireDayFree = busyIntervals.length === 0
    const workStartStr = minutesToTime(dayWindows[0]?.start ?? 600)
    const workEndStr = minutesToTime(dayWindows[dayWindows.length - 1]?.end ?? 1140)
    const workingHoursRange = `${workStartStr}-${workEndStr}`

    // Calculate span of available slots
    const firstSlotMins = timeStringToMinutes(daySlots[0]!)
    const lastSlotMins = timeStringToMinutes(daySlots[daySlots.length - 1]!)
    const spanMins = lastSlotMins - firstSlotMins

    // Recommended slots: pick up to 3 well-distributed slots across the available span
    // Instead of always stepping by 60 mins and stopping in the morning (10:00, 11:00, 12:00),
    // we adapt spacing to cover morning, afternoon and evening when the span allows.
    const minSpacingMins = spanMins >= 180
      ? Math.max(durationMins, Math.floor(spanMins / 3))
      : Math.max(60, durationMins)

    const recommendedSlots: string[] = []

    for (const slot of daySlots) {
      const slotMins = timeStringToMinutes(slot)
      const tooClose = recommendedSlots.some((rec) => {
        return Math.abs(slotMins - timeStringToMinutes(rec)) < minSpacingMins
      })
      if (!tooClose) {
        recommendedSlots.push(slot)
      }
      if (recommendedSlots.length >= 3) break
    }

    if (recommendedSlots.length < 3 && daySlots.length > recommendedSlots.length) {
      for (const slot of daySlots) {
        if (!recommendedSlots.includes(slot)) {
          recommendedSlots.push(slot)
          if (recommendedSlots.length >= 3) break
        }
      }
      recommendedSlots.sort()
    }

    const [, monthStr = '01', dayStr = '01'] = dateStr.split('-')
    const shortDate = `${dayStr}.${monthStr}`
    const summaryHebrew = isEntireDayFree
      ? `${dayName} (${shortDate}): פנוי לאורך כל היום (${workingHoursRange}) — למשל: ${recommendedSlots.join(' או ')}`
      : `${dayName} (${shortDate}): ${recommendedSlots.join(' או ')} (מתוך ${daySlots.length} משבצות פנויות)`

    availableDays.push({
      date: dateStr,
      dayOfWeek: dayName,
      availableSlots: daySlots,
      recommendedSlots: recommendedSlots.length > 0 ? recommendedSlots : daySlots.slice(0, 3),
      summaryHebrew,
      isEntireDayFree,
      workingHoursRange,
    })
  }

  const totalSlotsFound = availableDays.reduce((acc, d) => acc + d.availableSlots.length, 0)

  let readyToUseProposal = ''
  if (availableDays.length === 0) {
    readyToUseProposal = `לא נמצאו תורים פנויים של ${durationHours} שעות בטווח התאריכים שנבדק.`
  } else {
    const durText = durationHours === 0.75 ? 'כ-45 דקות' : durationHours === 1 ? 'כשעה' : `כ-${durationHours} שעות`
    const daysProposal = availableDays.slice(0, 3).map((ad) => {
      const [, m = '01', d = '01'] = ad.date.split('-')
      if (ad.isEntireDayFree && ad.workingHoursRange) {
        return `ב${ad.dayOfWeek} (${d}.${m}) פנוי לאורך כל שעות היום (${ad.workingHoursRange}) — למשל ב-${ad.recommendedSlots.join(' או ב-')}`
      }
      return `ב${ad.dayOfWeek} (${d}.${m}) ב-${ad.recommendedSlots.join(' או ב-')}`
    })
    readyToUseProposal = `${artistName} יכול להתחיל לתור של ${durText}: ${daysProposal.join(', ')}. איזו שעה הכי נוחה לך?`
  }

  return {
    artistName,
    durationHours,
    availableDays,
    readyToUseProposal,
    totalSlotsFound,
    bookedAppointments,
    workingHours: formattedHours,
  }
}

async function getAlternativeSlots(
  su: PocketBase,
  staffId: string,
  date: string,
  durationHours: number,
): Promise<string[]> {
  try {
    const res = await getAvailableSlotsForBot(su, {
      staffId,
      fromDate: date,
      days: 1,
      durationHours,
    })
    const day = res.availableDays[0]
    return day?.availableSlots || []
  } catch {
    return []
  }
}

export interface CreatePendingHoldInput {
  customerId: string
  staffId: string
  date: string
  timeSlot: string
  durationHours: number
  tattooDescription: string
  type?: 'tattoo' | 'sketch'
  allowException?: boolean
}

export interface CreatePendingHoldResult {
  status: 'created' | 'already_pending' | 'slot_taken' | 'invalid_staff_id' | 'date_in_past' | 'studio_closed'
  appointmentId: string | null
}

/** Creates an idempotent pending hold: re-validates the slot server-side (never trusts the
 *  model's own prior `check_availability` call) and cancels/replaces any existing pending hold
 *  for the same customer to avoid pending hold leaks (Bug 9). Supports staff override exceptions. */
export async function createPendingHoldForBot(
  su: PocketBase,
  input: CreatePendingHoldInput,
): Promise<CreatePendingHoldResult> {
  const { customerId, staffId, date, timeSlot, durationHours, tattooDescription, type = 'tattoo', allowException = false } = input
  if (slotIsInPast(date, timeSlot)) return { status: 'date_in_past', appointmentId: null }
  const closure = await isStudioClosedOn(su, date)
  if (closure.closed) return { status: 'studio_closed', appointmentId: null }
  if (!(await staffExists(su, staffId))) return { status: 'invalid_staff_id', appointmentId: null }
  const { start } = slotToRange(date, timeSlot, durationHours)

  // Serialized per staff member to prevent race conditions & double booking
  return bookingLock.runExclusive(staffId, async () => {
    // 1. Check if an identical hold is already pending
    const existingExactHold = await su.collection('appointments').getFirstListItem(
      `customer = "${customerId}" && staff = "${staffId}" && status = "pending" && start_time = "${start.toISOString()}"`,
    ).catch(() => null)
    if (existingExactHold) return { status: 'already_pending' as const, appointmentId: existingExactHold.id }

    // 2. Overlap validation unless staff explicitly granted an exception
    if (!allowException) {
      const taken = await overlapsExistingAppointment(su, staffId, date, timeSlot, durationHours)
      if (taken) return { status: 'slot_taken' as const, appointmentId: null }
    }

    // 3. Clean up any previous pending hold for this customer (Fix for Bug 9: pending hold leak)
    const previousPending = await su.collection('appointments').getFullList({
      filter: `customer = "${customerId}" && status = "pending"`,
    }).catch(() => [])

    for (const oldHold of previousPending) {
      await cancelAppointmentForBot(su, oldHold, { actor: 'bot', reason: 'hold_replaced', cancelledBy: 'system' }).catch(() => null)
    }

    // 3.5 Collect existing inspiration images sent in this conversation for THIS booking session
    const conv = await su.collection('conversations')
      .getFirstListItem(`customer = "${customerId}"`)
      .catch(() => null)
    let inspirationImages: string[] = []
    if (conv) {
      let sessionStartIso = conv.booking_session_started_at as string | undefined
      if (!sessionStartIso) {
        const lastClosedApt = await su.collection('appointments').getFirstListItem(
          `customer = "${customerId}" && (status = "completed" || status = "cancelled")`,
          { sort: '-updated' },
        ).catch(() => null)
        if (lastClosedApt) {
          sessionStartIso = (lastClosedApt.updated as string) || (lastClosedApt.created as string)
        }
      }

      const timeFilter = sessionStartIso ? ` && timestamp >= "${sessionStartIso}"` : ''
      const messages = await su.collection('messages').getFullList({
        filter: `conversation = "${conv.id}" && direction = "inbound" && media != "" && (media_category = "inspiration" || media_category = null)${timeFilter}`,
        sort: 'timestamp',
      }).catch(() => [])

      const pbUrl = (process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '')
      inspirationImages = messages.map(
        (m) => `${pbUrl}/api/files/messages/${m.id}/${encodeURIComponent(m.media as string)}`
      )
    }

    // 4. Create the new pending hold — inside the project the bot is already booking for (a session
    // after a consultation), or the project of the hold it just replaced; otherwise the hook in
    // pb_hooks/projects.pb.js starts a new one.
    const projectId = (conv?.active_project as string) || (previousPending[0]?.project as string) || ''
    const created = await su.collection('appointments').create({
      project: projectId,
      customer: customerId,
      staff: staffId,
      start_time: start.toISOString(),
      duration_minutes: durationHours * 60,
      ...statusChange('pending', 'bot', 'bot_hold'),
      type,
      tattoo_description: tattooDescription,
      source: 'ai_bot',
      is_exception: allowException,
      reference_images: inspirationImages,
    })

    if (conv && conv.active_project !== created.project) {
      await su.collection('conversations').update(conv.id, { active_project: created.project }).catch(() => null)
    }
    await titleInquiryProject(su, created.project as string, tattooDescription).catch((err: unknown) =>
      console.error(`[createPendingHoldForBot] titling project ${String(created.project)} failed:`, err),
    )

    // Link newly matched inspiration messages to this appointment
    if (conv && inspirationImages.length > 0) {
      su.collection('messages').getFullList({
        filter: `conversation = "${conv.id}" && direction = "inbound" && media != "" && appointment = null`,
      }).then((msgs) => {
        for (const m of msgs) {
          su.collection('messages').update(m.id, { appointment: created.id }).catch(() => null)
        }
      }).catch(() => null)
    }

    return { status: 'created' as const, appointmentId: created.id }
  })
}

/** All of the customer's currently active upcoming appointments (pending or confirmed) */
export async function getActiveAppointmentsForBot(
  su: PocketBase,
  customerId: string,
): Promise<RecordModel[]> {
  const activeThreshold = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  return su.collection('appointments').getFullList({
    filter: `customer = "${customerId}" && ${ACTIVE_STATUSES} && start_time >= "${activeThreshold}"`,
    sort: 'start_time',
    expand: 'staff',
  }).catch(() => [])
}

/** The customer's active upcoming appointment. If appointmentId is provided, finds that specific one. */
export async function getActiveAppointmentForBot(
  su: PocketBase,
  customerId: string,
  appointmentId?: string,
): Promise<RecordModel | null> {
  const activeThreshold = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  if (appointmentId && appointmentId.trim()) {
    const specific = await su
      .collection('appointments')
      .getOne(appointmentId.trim(), { expand: 'staff' })
      .catch(() => null)
    if (
      specific &&
      specific.customer === customerId &&
      (specific.status === 'pending' || specific.status === 'confirmed') &&
      new Date(specific.start_time as string).getTime() >= new Date(activeThreshold).getTime()
    ) {
      return specific
    }
    return null
  }

  return su.collection('appointments').getFirstListItem(
    `customer = "${customerId}" && ${ACTIVE_STATUSES} && start_time >= "${activeThreshold}"`,
    { sort: 'start_time', expand: 'staff' },
  ).catch(() => null)
}

export interface PastCustomerAppointmentsInfo {
  isReturning: boolean
  totalPastAppointments: number
  lastAppointmentDate: string | null
  lastStaffName: string | null
  lastTattooDescription: string | null
}

export async function getPastCustomerAppointmentsInfo(
  su: PocketBase,
  customerId: string,
): Promise<PastCustomerAppointmentsInfo> {
  const nowIso = new Date().toISOString()
  const pastList = await su.collection('appointments').getList(1, 10, {
    filter: `customer = "${customerId}" && (status = "completed" || (status = "confirmed" && start_time < "${nowIso}"))`,
    sort: '-start_time',
    expand: 'staff',
  }).catch(() => null)

  if (!pastList || pastList.items.length === 0) {
    return {
      isReturning: false,
      totalPastAppointments: 0,
      lastAppointmentDate: null,
      lastStaffName: null,
      lastTattooDescription: null,
    }
  }

  const latest = pastList.items[0]
  if (!latest) {
    return {
      isReturning: false,
      totalPastAppointments: 0,
      lastAppointmentDate: null,
      lastStaffName: null,
      lastTattooDescription: null,
    }
  }

  const latestStart = new Date(latest.start_time as string)
  const staffObj = latest.expand?.staff as RecordModel | undefined

  return {
    isReturning: true,
    totalPastAppointments: pastList.totalItems,
    lastAppointmentDate: toYmd(latestStart),
    lastStaffName: (staffObj?.name as string) || null,
    lastTattooDescription: (latest.tattoo_description as string) || null,
  }
}

export async function getCompletedAppointmentAwaitingNpsForBot(
  su: PocketBase,
  customerId: string,
): Promise<RecordModel | null> {
  // Bug 17: Limit NPS evaluation window to appointments completed in the last 14 days
  const fourteenDaysAgoIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  return su.collection('appointments').getFirstListItem(
    `customer = "${customerId}" && status = "completed" && nps_score = null && start_time >= "${fourteenDaysAgoIso}"`,
    { sort: '-start_time' },
  ).catch(() => null)
}

export async function cancelAppointmentForBot(
  su: PocketBase,
  appointment: RecordModel,
  by: { actor: StatusActor; reason: string; cancelledBy?: CancelledBy } = { actor: 'customer', reason: 'customer_request' },
): Promise<void> {
  await su.collection('appointments').update(appointment.id, statusChange('cancelled', by.actor, by.reason, by.cancelledBy))

  // Clean up any waitlist entries watching this appointment so they don't remain orphaned
  const watching = await su
    .collection('waitlist_entries')
    .getFullList({ filter: `current_appointment = "${appointment.id}" && status = "watching"` })
    .catch(() => [])
  for (const entry of watching) {
    await su.collection('waitlist_entries').update(entry.id, { status: 'cancelled' }).catch(() => null)
  }

  await syncAppointmentToGoogle(appointment.id).catch(() => null)
  await runWaitlistMatching({
    id: appointment.id,
    staff: (appointment.staff as string) || null,
    startTime: appointment.start_time as string,
    durationMinutes: Number(appointment.duration_minutes) || 120,
  }).catch((err) => console.error('[cancelAppointmentForBot] runWaitlistMatching error:', err))
}
