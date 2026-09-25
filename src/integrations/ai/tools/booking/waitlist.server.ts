import { z } from 'zod'
import type { ToolFactoryContext } from '../types'
import { getActiveAppointmentForBot, getActiveAppointmentsForBot } from '@/features/calendar/server/bot-appointments.server'
import { DETERMINISTIC_TEMPLATES, sendDeterministicMessage } from '../../engine/deterministic-templates'

export function buildWaitlistTools(ctx: ToolFactoryContext) {
  const { su, customerId, transitionState, botTool } = ctx

  return {
    flag_earlier_preference: botTool(
      'מוסיף את הלקוח לרשימת המתנה למשבצת מוקדמת יותר מהתור הקיים שלו. יש להשתמש בכלי זה כשהלקוח מביע רצון למועד מוקדם יותר מהתור שכבר נקבע לו, גם אם כרגע אין משבצת כזו פנויה — אם תתפנה משבצת מתאימה, הצוות ייצור איתו קשר.',
      z.object({
        appointmentId: z.string().optional().describe('מזהה התור שעבורו מעוניינים להקדים אם ישנם מספר תורים פעילים'),
        notBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('לא לפני תאריך זה בפורמט YYYY-MM-DD — אם לא צוין, מהיום'),
      }),
      async ({ appointmentId, notBefore }) => {
        // Only a confirmed appointment can be brought forward; a hold isn't booked yet.
        const appointment = appointmentId
          ? await getActiveAppointmentForBot(su, customerId, appointmentId)
          : ((await getActiveAppointmentsForBot(su, customerId)).find((a) => a.status === 'confirmed') ?? null)
        if (!appointment || appointment.status !== 'confirmed') {
          return { status: 'error', message: 'לא נמצא תור מאושר ללקוח הזה כרגע — אי אפשר להוסיף לרשימת המתנה להקדמה.' }
        }
        const existing = await su
          .collection('waitlist_entries')
          .getFirstListItem(`customer = "${customerId}" && current_appointment = "${appointment.id}" && status = "watching"`)
          .catch(() => null)
        if (existing) {
          return { status: 'success', message: 'הלקוח כבר ברשימת ההמתנה למשבצת מוקדמת יותר עבור תור זה — אין צורך להוסיף שוב.' }
        }
        await su.collection('waitlist_entries').create({
          customer: customerId,
          current_appointment: appointment.id,
          status: 'watching',
          source: 'ai_bot',
          not_before: notBefore ? new Date(`${notBefore}T00:00:00`).toISOString() : null,
        })
        return {
          status: 'success',
          message: 'הלקוח נוסף לרשימת ההמתנה למשבצת מוקדמת יותר. הודע/י לו בנימוס שניצור איתו קשר אם תתפנה משבצת מתאימה — אין הבטחה למועד מדויק.',
        }
      }
    ),

    join_waitlist: botTool(
      'מוסיף את הלקוח לרשימת ההמתנה של הסטודיו (Waitlist) ומעביר את השיחה למצב WAITLIST. יש להציע כלי זה ללקוח כאשר אין משבצות פנויות ביומן או כאשר הלקוח מבקש להירשם לרשימת המתנה.',
      z.object({
        staffId: z.string().optional().describe('מזהה האמן המועדף (staffId) אם נבחר'),
        preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').optional().describe('תאריך מועדף או תאריך שממנו והלאה מעוניינים'),
        notes: z.string().optional().describe('הערות נוספות (סגנון, ימים מועדפים בשבוע וכו)'),
      }),
      async ({ staffId, preferredDate, notes }) => {
        const activeAppointment = await getActiveAppointmentForBot(su, customerId).catch(() => null)
        try {
          await su.collection('waitlist_entries').create({
            customer: customerId,
            ...(activeAppointment ? { current_appointment: activeAppointment.id } : {}),
            preferred_staff: staffId || null,
            not_before: preferredDate ? new Date(`${preferredDate}T00:00:00`).toISOString() : null,
            status: 'watching',
            source: 'ai_bot',
            notes: notes || 'רישום יזום ע"י הבוט',
          })
        } catch (err) {
          console.warn('[join_waitlist] Error creating waitlist entry:', err)
        }

        await transitionState('WAITLIST', { reason: 'join_waitlist' })
        await sendDeterministicMessage(ctx, DETERMINISTIC_TEMPLATES.waitlistJoined())

        return {
          status: 'success',
          message: 'הלקוח נרשם בהצלחה לרשימת ההמתנה ומצב השיחה הועבר ל-WAITLIST. הודע לו בחום שנפנה אליו ברגע שיתפנה מועד מתאים עקב ביטול.',
        }
      }
    ),
  }
}
