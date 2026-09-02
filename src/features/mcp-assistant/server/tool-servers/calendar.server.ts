import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import {
  checkAvailabilityForBot,
  getArtistScheduleForBot,
} from '@/features/calendar/server/bot-appointments'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'
import { toYmd, minutesToTime, timeToMinutes } from '@/lib/date-utils'
import { mcpReadTool, mcpWriteTool } from './shared'
import type { McpToolContext } from './shared'
import type { McpActionDiff } from '../types'

const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  confirmed: 'מאושר',
  cancelled: 'בוטל',
  completed: 'הושלם',
  no_show: 'לא הגיע/ה',
}

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** Reasons a staff-confirmed one-off exception (`allowException`) may override — the artist's
 *  own weekly hours, or a studio-wide closure day. Never `slot_taken`/`date_in_past`/
 *  `invalid_staff_id`/`no_working_hours_configured` — an exception can't un-book a taken slot,
 *  move time backward, fix a bad id, or invent hours that were never configured at all. */
const EXCEPTION_BYPASSABLE_REASONS = new Set(['outside_working_hours', 'studio_closed'])

const EXCEPTION_DIFF_ROW = {
  label: 'שימו לב',
  before: '—',
  after: 'מחוץ לשעות הפעילות הרגילות / ביום סגור — נקבע כהחרגה חד-פעמית לאחר אישור בעל/ת התור',
}

export function buildCalendarTools(ctx: McpToolContext) {
  return {
    list_appointments: mcpReadTool(
      'מציג רשימת תורים בטווח תאריכים נתון, עם אפשרות סינון לפי איש/אשת צוות.',
      z.object({
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('תאריך התחלה YYYY-MM-DD'),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('תאריך סיום YYYY-MM-DD (כולל)'),
        staffId: z.string().optional().describe('סינון לפי מזהה איש/אשת צוות ספציפי/ת'),
      }),
      async ({ fromDate, toDate, staffId }) => {
        const su = await getSuperuserClient()
        const rangeStart = new Date(`${fromDate}T00:00:00`)
        const rangeEnd = new Date(`${toDate}T23:59:59`)
        const staffFilter = staffId ? ` && staff = "${staffId}"` : ''
        const records = await su.collection('appointments').getFullList({
          filter: `start_time >= "${rangeStart.toISOString()}" && start_time <= "${rangeEnd.toISOString()}"${staffFilter}`,
          expand: 'customer,staff',
          sort: 'start_time',
        })
        const items = records.map((item) => {
          const d = new Date(item.start_time as string)
          return {
            id: item.id,
            date: toYmd(d),
            timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
            status: item.status as string,
            customerName: (item.expand?.customer?.name as string) || 'לקוח ללא שם',
            staffName: (item.expand?.staff?.name as string) || null,
            description: (item.tattoo_description as string) || null,
            depositPaid: Boolean(item.deposit_paid),
          }
        })
        return { status: 'success', message: `נמצאו ${items.length} תורים בטווח.`, data: items }
      },
    ),

    find_free_slots: mcpReadTool(
      'מוצא חלונות פנויים אצל איש/אשת צוות בטווח ימים קדימה, לפי שעות הפעילות המוגדרות ותורים קיימים.',
      z.object({
        staffId: z.string().describe('מזהה איש/אשת הצוות'),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('תאריך התחלה YYYY-MM-DD'),
        days: z.number().int().min(1).max(30).default(7),
      }),
      async ({ staffId, fromDate, days }) => {
        const su = await getSuperuserClient()
        const [schedule, workingHours] = await Promise.all([
          getArtistScheduleForBot(su, { staffId, fromDate, days }),
          getWorkingHoursForStaff(su, staffId),
        ])
        const bookedByDay = new Map<string, Set<number>>()
        for (const entry of schedule) {
          const set = bookedByDay.get(entry.date) ?? new Set()
          set.add(timeToMinutes(entry.timeSlot))
          bookedByDay.set(entry.date, set)
        }
        // Weekly working-hours windows, not resolved to exact free minutes per date — the model
        // cross-references these against `bookedSlotsByDay` itself, and `reschedule_appointment`
        // re-validates the exact slot server-side before ever proposing it, so no benefit to
        // duplicating that per-slot math here.
        const weeklyHours = workingHours.map((w) => ({
          day: DAY_NAMES[w.dayOfWeek] || String(w.dayOfWeek),
          window: `${w.startTime}–${w.endTime}`,
        }))
        return {
          status: 'success',
          message: 'אלו שעות הפעילות השבועיות והתורים התפוסים בטווח. יש להציע ללקוח/ה זמן פנוי בתוך שעות אלה ושאינו מופיע כתפוס, ולוודא זמינות מדויקת דרך reschedule_appointment (שבודק זמינות בעצמו לפני יצירת ההצעה).',
          data: { weeklyHours, bookedSlotsByDay: Object.fromEntries(bookedByDay.entries()) },
        }
      },
    ),

    reschedule_appointment: mcpWriteTool(
      ctx,
      'reschedule_appointment',
      'מציע להעביר תור קיים למועד אחר. לעולם לא מבצע את ההעברה מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({
        appointmentId: z.string(),
        newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        newTimeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        allowException: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'true רק אחרי שבעל/ת התור אישר/ה במפורש בשיחה לחרוג משעות הפעילות הרגילות או מיום סגור עבור התור הזה בלבד — אין להסיק הסכמה, יש לשאול קודם.',
          ),
      }),
      async ({ appointmentId, newDate, newTimeSlot, allowException }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
        const staffId = appointment.staff as string
        const durationHours = (Number(appointment.duration_minutes) || 120) / 60
        const availability = await checkAvailabilityForBot(su, { staffId, date: newDate, timeSlot: newTimeSlot, durationHours })
        if (!availability.available && !(allowException && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason))) {
          throw new Error(`המשבצת המבוקשת אינה זמינה (${availability.reason}) — יש לבחור מועד אחר.`)
        }
        const oldStart = new Date(appointment.start_time as string)
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        return {
          summary: `העברת תור — ${customerName}`,
          rows: [
            {
              label: customerName,
              before: `${toYmd(oldStart)} ${minutesToTime(oldStart.getHours() * 60 + oldStart.getMinutes())}`,
              after: `${newDate} ${newTimeSlot}`,
            },
            ...(!availability.available ? [EXCEPTION_DIFF_ROW] : []),
          ],
        } satisfies McpActionDiff
      },
    ),

    cancel_appointment: mcpWriteTool(
      ctx,
      'cancel_appointment',
      'מציע לבטל תור קיים. לעולם לא מבצע את הביטול מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({ appointmentId: z.string() }),
      async ({ appointmentId }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
        const start = new Date(appointment.start_time as string)
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        return {
          summary: `ביטול תור — ${customerName}`,
          rows: [
            {
              label: customerName,
              before: `${toYmd(start)} ${minutesToTime(start.getHours() * 60 + start.getMinutes())} · ${appointment.status}`,
              after: 'בוטל',
            },
          ],
        } satisfies McpActionDiff
      },
    ),

    create_appointment: mcpWriteTool(
      ctx,
      'create_appointment',
      'מציע לקבוע תור חדש ללקוח/ה קיימ/ת. לעולם לא קובע מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({
        customerId: z.string().describe('מזהה הלקוח/ה (יש לאתר אותו/ה קודם דרך search_leads/get_customer)'),
        staffId: z.string().describe('מזהה איש/אשת הצוות'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        durationMinutes: z.number().int().min(15).max(1440).default(120),
        tattooDescription: z.string().optional(),
        status: z.enum(['pending', 'confirmed']).default('pending'),
        allowException: z
          .boolean()
          .optional()
          .default(false)
          .describe(
            'true רק אחרי שבעל/ת התור אישר/ה במפורש בשיחה לחרוג משעות הפעילות הרגילות או מיום סגור עבור התור הזה בלבד — אין להסיק הסכמה, יש לשאול קודם.',
          ),
      }),
      async ({ customerId, staffId, date, timeSlot, durationMinutes, tattooDescription, status, allowException }) => {
        const su = await getSuperuserClient()
        const customer = await su.collection('customers').getOne(customerId)
        const availability = await checkAvailabilityForBot(su, { staffId, date, timeSlot, durationHours: durationMinutes / 60 })
        if (!availability.available && !(allowException && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason))) {
          throw new Error(`המשבצת המבוקשת אינה זמינה (${availability.reason}) — יש לבחור מועד אחר.`)
        }
        return {
          summary: `קביעת תור חדש — ${(customer.name as string) || customer.phone}`,
          rows: [
            {
              label: (customer.name as string) || (customer.phone as string) || 'לקוח',
              before: '—',
              after: `${date} ${timeSlot} (${durationMinutes} דק') · ${APPOINTMENT_STATUS_LABELS[status]}${tattooDescription ? ` · ${tattooDescription}` : ''}`,
            },
            ...(!availability.available ? [EXCEPTION_DIFF_ROW] : []),
          ],
        } satisfies McpActionDiff
      },
    ),

    mark_appointment_status: mcpWriteTool(
      ctx,
      'mark_appointment_status',
      'מציע לעדכן את סטטוס התור (הושלם / לא הגיע / בוטל). לעולם לא מעדכן מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({
        appointmentId: z.string(),
        status: z.enum(['completed', 'no_show', 'cancelled']),
      }),
      async ({ appointmentId, status }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        const currentStatus = (appointment.status as string) || 'pending'
        return {
          summary: `עדכון סטטוס תור — ${customerName}`,
          rows: [
            {
              label: customerName,
              before: APPOINTMENT_STATUS_LABELS[currentStatus] || currentStatus,
              after: APPOINTMENT_STATUS_LABELS[status] || status,
            },
          ],
        } satisfies McpActionDiff
      },
    ),
  }
}

/** The only place these two write tools actually mutate the database — called from
 *  `approval.ts` when the owner taps "אשר ובצע", never from the model's own tool call. */
export async function commitCalendarAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  const su = await getSuperuserClient()
  if (toolName === 'reschedule_appointment') {
    const { appointmentId, newDate, newTimeSlot, allowException } = args as {
      appointmentId: string
      newDate: string
      newTimeSlot: string
      allowException?: boolean
    }
    const appointment = await su.collection('appointments').getOne(appointmentId)
    const staffId = appointment.staff as string
    const durationHours = (Number(appointment.duration_minutes) || 120) / 60
    const availability = await checkAvailabilityForBot(su, { staffId, date: newDate, timeSlot: newTimeSlot, durationHours })
    const bypassed = !availability.available && Boolean(allowException) && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason)
    if (!availability.available && !bypassed) {
      throw new Error('המשבצת כבר אינה זמינה — ייתכן שנתפסה בינתיים.')
    }
    const [year, month, day] = newDate.split('-').map(Number)
    const [hour, minute] = newTimeSlot.split(':').map(Number)
    const newStart = new Date(year!, month! - 1, day!, hour!, minute!)
    await su.collection('appointments').update(appointmentId, {
      start_time: newStart.toISOString(),
      ...(bypassed ? { is_exception: true } : {}),
    })
    return 'התור הועבר בהצלחה.'
  }
  if (toolName === 'cancel_appointment') {
    const { appointmentId } = args as { appointmentId: string }
    await su.collection('appointments').update(appointmentId, { status: 'cancelled' })
    return 'התור בוטל בהצלחה.'
  }
  if (toolName === 'create_appointment') {
    const { customerId, staffId, date, timeSlot, durationMinutes, tattooDescription, status, allowException } = args as {
      customerId: string
      staffId: string
      date: string
      timeSlot: string
      durationMinutes: number
      tattooDescription?: string
      status: 'pending' | 'confirmed'
      allowException?: boolean
    }
    const availability = await checkAvailabilityForBot(su, { staffId, date, timeSlot, durationHours: durationMinutes / 60 })
    const bypassed = !availability.available && Boolean(allowException) && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason)
    if (!availability.available && !bypassed) {
      throw new Error('המשבצת כבר אינה זמינה — ייתכן שנתפסה בינתיים.')
    }
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = timeSlot.split(':').map(Number)
    const startTime = new Date(year!, month! - 1, day!, hour!, minute!)
    await su.collection('appointments').create({
      customer: customerId,
      staff: staffId,
      start_time: startTime.toISOString(),
      duration_minutes: durationMinutes,
      status,
      tattoo_description: tattooDescription || '',
      slot_confirmed: status === 'confirmed',
      source: 'staff_manual',
      is_exception: bypassed,
    })
    return 'התור נקבע בהצלחה.'
  }
  if (toolName === 'mark_appointment_status') {
    const { appointmentId, status } = args as { appointmentId: string; status: string }
    await su.collection('appointments').update(appointmentId, { status })
    return 'סטטוס התור עודכן בהצלחה.'
  }
  throw new Error(`Unknown calendar action: ${toolName}`)
}

export const CALENDAR_WRITE_TOOLS = new Set([
  'reschedule_appointment',
  'cancel_appointment',
  'create_appointment',
  'mark_appointment_status',
])
