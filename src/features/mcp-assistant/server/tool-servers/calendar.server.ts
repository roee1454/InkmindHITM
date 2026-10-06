import { z } from 'zod'
import { changeAttribution, statusChange } from '@/features/calendar/utils/appointment-transitions'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import {
  checkAvailabilityForBot,
  getArtistScheduleForBot,
} from '@/features/calendar/server/bot-appointments.server'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'
import { toYmd, minutesToTime, timeToMinutes } from '@/lib/date-utils'
import { syncAppointmentToGoogle } from '@/integrations/google-calendar/server/google-sync.server'
import { handleCloseSession } from '@/features/payments/server/close-session.server'
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

const EXCEPTION_BYPASSABLE_REASONS = new Set(['outside_working_hours', 'studio_closed'])

const EXCEPTION_DIFF_ROW = {
  label: 'שימו לב',
  before: '—',
  after: 'מחוץ לשעות הפעילות הרגילות / ביום סגור — נקבע כהחרגה חד-פעמית לאחר אישור בעל/ת התור',
}

export function buildCalendarTools(ctx: McpToolContext) {
  return {
    list_appointments: mcpReadTool(
      'מציג רשימת תורים בטווח תאריכים נתון (כולל סוג התור: סשן, פגישת ייעוץ, או טאץ-אפ, ושיוך לפרויקט), עם אפשרות סינון לפי איש/אשת צוות.',
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
          expand: 'customer,staff,project',
          sort: 'start_time',
        })
        const items = records.map((item) => {
          const d = new Date(item.start_time as string)
          const project = item.expand?.project as Record<string, unknown> | undefined
          const kind = (item.kind as string) || 'session'
          const kindLabel =
            kind === 'session' ? 'סשן קעקוע' : kind === 'consultation' ? 'פגישת ייעוץ' : "טאץ'-אפ"
          return {
            id: item.id,
            kind,
            kindLabel,
            date: toYmd(d),
            timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
            durationMinutes: Number(item.duration_minutes) || 0,
            status: item.status as string,
            statusLabel: APPOINTMENT_STATUS_LABELS[item.status as string] || item.status,
            customerName: (item.expand?.customer?.name as string) || 'לקוח ללא שם',
            customerId: item.customer as string,
            staffName: (item.expand?.staff?.name as string) || null,
            staffId: (item.staff as string) || null,
            projectId: (item.project as string) || null,
            projectTitle: (project?.title as string) || null,
            finalPrice: item.final_price != null ? Number(item.final_price) : null,
            chargeWaived: Boolean(item.charge_waived),
            description: (item.tattoo_description as string) || null,
            depositPaid: Boolean(item.deposit_paid),
            depositAmount: item.deposit_amount != null ? Number(item.deposit_amount) : null,
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
        const weeklyHours = workingHours.map((w) => ({
          day: DAY_NAMES[w.dayOfWeek] || String(w.dayOfWeek),
          window: `${w.startTime}–${w.endTime}`,
        }))
        return {
          status: 'success',
          message: `נמצאו שעות פעילות ותורים עבור איש/אשת הצוות.`,
          data: {
            staffId,
            weeklyWorkingHours: weeklyHours,
            bookedSlotsByDay: Object.fromEntries(
              Array.from(bookedByDay.entries()).map(([date, slots]) => [
                date,
                Array.from(slots)
                  .sort((a, b) => a - b)
                  .map(minutesToTime),
              ]),
            ),
          },
        }
      },
    ),

    reschedule_appointment: mcpWriteTool(
      ctx,
      'reschedule_appointment',
      'מציע להעביר תור קיים למועד חדש (תאריך ושעה). לעולם לא מעביר מיד — רק מציג הצעה לאישור הבעלים. אם המועד חורג משעות הפעילות הרגילות, יש להסביר זאת קודם בשיחה ולקבל אישור להחרגה (allowException).',
      z.object({
        appointmentId: z.string().describe('מזהה התור להעברה'),
        newDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('התאריך החדש YYYY-MM-DD'),
        newTimeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe('השעה החדשה HH:MM'),
        allowException: z.boolean().default(false).optional().describe('אישור חריגה חד-פעמית מחוץ לשעות הפעילות הרגילות'),
      }),
      async ({ appointmentId, newDate, newTimeSlot, allowException }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer,staff' })
        const staffId = appointment.staff as string
        const durationHours = (Number(appointment.duration_minutes) || 120) / 60
        const availability = await checkAvailabilityForBot(su, {
          staffId,
          date: newDate,
          timeSlot: newTimeSlot,
          durationHours,
        })
        if (!availability.available && !(allowException && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason))) {
          throw new Error(`המשבצת המבוקשת אינה זמינה (${availability.reason}) — יש לבחור מועד אחר.`)
        }
        const oldDate = toYmd(new Date(appointment.start_time as string))
        const oldTime = minutesToTime(
          new Date(appointment.start_time as string).getHours() * 60 +
            new Date(appointment.start_time as string).getMinutes(),
        )
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        return {
          summary: `העברת תור — ${customerName}`,
          rows: [
            {
              label: 'מועד התור',
              before: `${oldDate} ${oldTime}`,
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
      'מציע לבטל תור קיים. לעולם לא מבטל מיד — רק מציג הצעה לאישור הבעלים.',
      z.object({
        appointmentId: z.string(),
        reason: z.string().optional().describe('סיבת הביטול (אופציונלי)'),
      }),
      async ({ appointmentId, reason }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        const d = new Date(appointment.start_time as string)
        const dateStr = `${toYmd(d)} ${minutesToTime(d.getHours() * 60 + d.getMinutes())}`
        return {
          summary: `ביטול תור — ${customerName}`,
          rows: [
            {
              label: 'סטטוס',
              before: `${dateStr} (${APPOINTMENT_STATUS_LABELS[appointment.status as string] || appointment.status})`,
              after: `בוטל${reason ? ` (${reason})` : ''}`,
            },
          ],
        } satisfies McpActionDiff
      },
    ),

    create_appointment: mcpWriteTool(
      ctx,
      'create_appointment',
      'מציע לקבוע תור חדש ביומן ללקוח/ה קיים/ת. לעולם לא קובע מיד — רק מציג הצעה לאישור הבעלים. אם המועד חורג משעות הפעילות, יש להסביר זאת ולקבל אישור להחרגה (allowException).',
      z.object({
        customerId: z.string().describe('מזהה הלקוח/ה'),
        staffId: z.string().describe('מזהה איש/אשת הצוות (יש לאתר קודם עם list_staff לפי שם)'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('תאריך התור YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe('שעת התור HH:MM'),
        durationMinutes: z.number().int().min(15).max(720).default(120).describe('משך התור בדקות'),
        tattooDescription: z.string().optional().describe('תיאור הקעקוע / מה עושים בתור'),
        status: z.enum(['pending', 'confirmed']).default('confirmed'),
        allowException: z.boolean().default(false).optional().describe('אישור חריגה חד-פעמית מחוץ לשעות הפעילות'),
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
      'מציע לעדכן את סטטוס התור (מאושר / לא הגיע / בוטל, או הושלם עבור פגישת ייעוץ בלבד). לעולם לא מעדכן מיד — רק מציג הצעה לאישור הבעלים. שים לב: לסגירת סשן קעקוע שהסתיים יש להשתמש ב-close_session בלבד!',
      z.object({
        appointmentId: z.string(),
        status: z.enum(['confirmed', 'no_show', 'cancelled', 'completed']),
      }),
      async ({ appointmentId, status }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer' })
        const customerName = (appointment.expand?.customer?.name as string) || 'לקוח'
        const currentStatus = (appointment.status as string) || 'pending'

        if (status === 'completed' && appointment.kind !== 'consultation') {
          throw new Error(
            'לא ניתן לסמן סשן קעקוע כהושלם בעדכון סטטוס רגיל. יש להשתמש בכלי close_session כדי להזין מחיר סופי ותקבולים.',
          )
        }

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

    close_session: mcpWriteTool(
      ctx,
      'close_session',
      'מציע לסגור סשן קעקוע שהסתיים: רישום מחיר סופי (או ללא חיוב), ותיעוד התשלומים ששולמו במעמד הסגירה. לעולם לא סוגר מיד — רק מציג הצעה לאישור.',
      z.object({
        appointmentId: z.string().describe('מזהה התור (סשן הקעקוע)'),
        finalPrice: z.number().min(0).optional().describe('מחיר סופי לתור (חובה אם לא סומן chargeWaived)'),
        chargeWaived: z.boolean().default(false).optional().describe('האם הסשן בוצע ללא חיוב (למשל תיקון חינם במסגרת אחריות)'),
        payments: z
          .array(
            z.object({
              method: z.enum(['bit', 'paybox', 'cash', 'credit_card', 'bank_transfer', 'other']),
              amount: z.number().min(1).describe('סכום התשלום שנגבה'),
            }),
          )
          .default([])
          .optional()
          .describe('רשימת התשלומים ששולמו בסיום הסשן'),
        completesProject: z
          .boolean()
          .default(false)
          .optional()
          .describe('האם זה היה הסשן האחרון של הפרויקט והפרויקט הושלם'),
      }),
      async ({ appointmentId, finalPrice, chargeWaived, payments = [], completesProject = false }) => {
        const su = await getSuperuserClient()
        const appointment = await su.collection('appointments').getOne(appointmentId, { expand: 'customer,project' })
        const customer = appointment.expand?.customer as Record<string, unknown> | undefined
        const customerName = (customer?.name as string) || 'לקוח ללא שם'
        const project = appointment.expand?.project as Record<string, unknown> | undefined
        const projectTitle = (project?.title as string) || 'פרויקט'

        if (appointment.status === 'completed') throw new Error('הסשן כבר סגור.')
        if (appointment.status === 'cancelled') throw new Error('אי אפשר לסגור תור שבוטל.')
        if (appointment.kind === 'consultation') throw new Error('פגישת ייעוץ לא נסגרת בסגירת סשן — מעדכנים סטטוס להושלם.')
        if (!chargeWaived && !(finalPrice && finalPrice > 0)) {
          throw new Error('יש לציין מחיר סופי לתור או לסמן ללא חיוב (chargeWaived: true).')
        }

        const d = new Date(appointment.start_time as string)
        const dateStr = `${toYmd(d)} ${minutesToTime(d.getHours() * 60 + d.getMinutes())}`

        const rows: { label: string; before: string; after: string }[] = [
          { label: 'תור', before: `${dateStr} (${appointment.status})`, after: 'הושלם (סגור)' },
          { label: 'מחיר סופי', before: '—', after: chargeWaived ? 'ללא חיוב (0 ₪)' : `₪${finalPrice}` },
        ]

        if (payments.length > 0) {
          const paymentsDesc = payments.map((p) => `₪${p.amount} ב-${p.method}`).join(', ')
          rows.push({ label: 'תשלומים שהתקבלו', before: '—', after: paymentsDesc })
        } else {
          rows.push({ label: 'תשלומים שהתקבלו', before: '—', after: 'ללא תשלום נוסף' })
        }

        if (completesProject) {
          rows.push({ label: 'סיום פרויקט', before: 'פעיל', after: 'הפרויקט יושלם' })
        }

        return {
          summary: `סגירת סשן — ${customerName} (${projectTitle})`,
          rows,
        } satisfies McpActionDiff
      },
    ),

    block_artist_time: mcpWriteTool(
      ctx,
      'block_artist_time',
      'חוסם זמן ספציפי ביומן של איש/אשת צוות (למשל עבור מילואים, סידורים, ישיבות או חופשה).',
      z.object({
        staffId: z.string().describe('מזהה איש/אשת הצוות'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('תאריך החסימה YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).describe('שעת תחילת החסימה HH:MM'),
        durationHours: z.number().min(0.5).max(12).default(2).describe('משך החסימה בשעות'),
        reason: z.string().default('חסימת זמן סטודיו').describe('סיבת החסימה (למשל: מילואים, סידורים, ישיבה)'),
      }),
      async ({ staffId, date, timeSlot, durationHours, reason }) => {
        const su = await getSuperuserClient()
        const staff = await su.collection('staff').getOne(staffId)
        return {
          summary: `חסימת זמן — ${(staff.name as string) || 'אמן/ית'}`,
          rows: [
            {
              label: (staff.name as string) || 'אמן/ית',
              before: '—',
              after: `${date} ${timeSlot} (${durationHours} שעות) · ${reason}`,
            },
          ],
        } satisfies McpActionDiff
      },
    ),
  }
}

export async function commitCalendarAction(toolName: string, args: Record<string, unknown>): Promise<string> {
  const su = await getSuperuserClient()

  if (toolName === 'reschedule_appointment') {
    const { appointmentId, newDate, newTimeSlot, allowException } = args as {
      appointmentId: string
      newDate: string
      newTimeSlot: string
      allowException?: boolean
    }
    const [year, month, day] = newDate.split('-').map(Number)
    const [hour, minute] = newTimeSlot.split(':').map(Number)
    const newStartTimeIso = new Date(year!, month! - 1, day, hour, minute).toISOString()

    const appointment = await su.collection('appointments').getOne(appointmentId)
    const staffId = appointment.staff as string
    const durationHours = (Number(appointment.duration_minutes) || 120) / 60
    const availability = await checkAvailabilityForBot(su, {
      staffId,
      date: newDate,
      timeSlot: newTimeSlot,
      durationHours,
    })
    const bypassed = !availability.available && Boolean(allowException && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason))
    if (!availability.available && !bypassed) {
      throw new Error(`המשבצת המבוקשת אינה זמינה (${availability.reason}) — לא ניתן להעביר את התור לשם.`)
    }

    const attribution = changeAttribution('staff', 'mcp_assistant')
    await su.collection('appointments').update(appointmentId, {
      start_time: newStartTimeIso,
      is_exception: bypassed,
      ...attribution,
    })

    await syncAppointmentToGoogle(appointmentId).catch(() => null)
    return 'התור הועבר בהצלחה.'
  }

  if (toolName === 'cancel_appointment') {
    const { appointmentId, reason } = args as { appointmentId: string; reason?: string }
    const transition = statusChange('cancelled', 'staff', reason || 'בוטל ע״י עוזר ה-MCP')
    await su.collection('appointments').update(appointmentId, transition)
    await syncAppointmentToGoogle(appointmentId).catch(() => null)
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
      status: string
      allowException?: boolean
    }
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = timeSlot.split(':').map(Number)
    const startTimeIso = new Date(year!, month! - 1, day, hour, minute).toISOString()
    const availability = await checkAvailabilityForBot(su, {
      staffId,
      date,
      timeSlot,
      durationHours: durationMinutes / 60,
    })
    const bypassed = !availability.available && Boolean(allowException && EXCEPTION_BYPASSABLE_REASONS.has(availability.reason))
    if (!availability.available && !bypassed) {
      throw new Error(`המשבצת המבוקשת אינה זמינה (${availability.reason}) — לא ניתן לקבוע את התור.`)
    }
    const created = await su.collection('appointments').create({
      customer: customerId,
      staff: staffId,
      start_time: startTimeIso,
      duration_minutes: durationMinutes,
      status,
      tattoo_description: tattooDescription || '',
      deposit_paid: false,
      slot_confirmed: status === 'confirmed',
      source: 'staff_manual',
      is_exception: bypassed,
    })
    await syncAppointmentToGoogle(created.id).catch(() => null)
    return 'התור נקבע בהצלחה.'
  }

  if (toolName === 'block_artist_time') {
    const { staffId, date, timeSlot, durationHours, reason } = args as {
      staffId: string
      date: string
      timeSlot: string
      durationHours: number
      reason?: string
    }
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = timeSlot.split(':').map(Number)
    const startTimeIso = new Date(year!, month! - 1, day, hour, minute).toISOString()

    const created = await su.collection('appointments').create({
      customer: null,
      customer_name_override: 'סטודיו Inkmind (חסימת זמן)',
      staff: staffId,
      start_time: startTimeIso,
      duration_minutes: Math.round(durationHours * 60),
      status: 'confirmed',
      tattoo_description: `[חסימת זמן] ${reason || 'חסימת סטודיו'}`,
      deposit_paid: true,
      slot_confirmed: true,
      source: 'staff_manual',
    })

    await syncAppointmentToGoogle(created.id).catch(() => null)
    return `נחסם זמן בהצלחה ביומן עבור ${date} בשעה ${timeSlot}.`
  }

  if (toolName === 'mark_appointment_status') {
    const { appointmentId, status } = args as { appointmentId: string; status: string }
    const appointment = await su.collection('appointments').getOne(appointmentId)

    if (status === 'completed' && appointment.kind !== 'consultation') {
      throw new Error(
        'לא ניתן לסמן סשן קעקוע כהושלם בעדכון סטטוס רגיל. יש להשתמש בכלי close_session כדי להזין מחיר סופי ותקבולים.',
      )
    }

    const transition = statusChange(status as any, 'staff', 'mcp_assistant')
    await su.collection('appointments').update(appointmentId, transition)
    await syncAppointmentToGoogle(appointmentId).catch(() => null)
    return 'סטטוס התור עודכן בהצלחה.'
  }

  if (toolName === 'close_session') {
    const { appointmentId, finalPrice, chargeWaived, payments, completesProject } = args as {
      appointmentId: string
      finalPrice?: number
      chargeWaived?: boolean
      payments?: Array<{ method: any; amount: number }>
      completesProject?: boolean
    }

    const actor = { id: 'mcp_assistant', role: 'admin' as const }
    const finance = await handleCloseSession(
      {
        appointmentId,
        finalPrice: finalPrice ?? null,
        chargeWaived: Boolean(chargeWaived),
        payments: payments ?? [],
        completesProject: Boolean(completesProject),
      },
      { su, actor },
    )
    return `הסשן נסגר בהצלחה. יתרת הפרויקט לתשלום: ₪${finance.balance.due}.`
  }

  throw new Error(`Unknown calendar action: ${toolName}`)
}

export const CALENDAR_WRITE_TOOLS = new Set([
  'reschedule_appointment',
  'cancel_appointment',
  'create_appointment',
  'block_artist_time',
  'mark_appointment_status',
  'close_session',
])
