import { z } from 'zod'
import { BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION, depositStaffSummary } from '@/lib/cancellation-policy'
import type { ToolFactoryContext } from '../types'
import { getActiveAppointmentsForBot, cancelAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { minutesToTime } from '#/features/calendar/utils/date-utils'
import type { ConversationState } from '../../prompts'

export function buildCancellationTools(ctx: ToolFactoryContext) {
  const {
    su,
    conversationId,
    customerId,
    conversationState,
    updateConversation,
    transitionState,
    notifyStaff,
    botTool,
  } = ctx

  return {
    request_reschedule: botTool(
      'מעביר בקשת שינוי מועד לצוות האנושי. לפני הקריאה לכלי, שאלו את הלקוח מה המועד המועדף עליו. אם ישנם מספר תורים פעילים, ציינו את appointmentId.',
      z.object({
        appointmentId: z.string().optional().describe('מזהה התור לשינוי מועד אם ללקוח יש מספר תורים פעילים'),
        details: z.string().min(1).describe('המועד המועדף החדש של הלקוח ופרטים נוספים'),
      }),
      async ({ appointmentId, details }) => {
        const activeAppointments = await getActiveAppointmentsForBot(su, customerId)
        if (activeAppointments.length > 1 && !appointmentId) {
          const summaryList = activeAppointments
            .map((a, idx) => {
              const d = new Date(a.start_time as string)
              const typeLabel = a.type === 'sketch' ? 'פגישת סקיצה' : 'קעקוע'
              const staffName = (a.expand?.staff)?.name || 'המקעקע'
              return `${idx + 1}. [מזהה: ${a.id}] ${typeLabel} בתאריך ${d.toLocaleDateString('he-IL')} בשעה ${minutesToTime(d.getHours() * 60 + d.getMinutes())} אצל ${staffName}`
            })
            .join('\n')

          return {
            status: 'clarification_needed',
            message: `ללקוח יש מספר תורים עתידיים פעילים:\n${summaryList}\n\nשאל/י את הלקוח לאיזה מהתורים הכוונה כדי שנוכל להעביר את הבקשה המדויקת לצוות.`,
          }
        }

        await updateConversation({
          status: 'escalated',
          is_staff_called: true,
          staff_call_reason: 'reschedule_request',
        })
        await notifyStaff('בקשת שינוי מועד', details)
        return {
          status: 'success',
          message: 'הצוות עודכן על בקשת שינוי המועד. הודע/י ללקוח בקצרה שחבר/ת צוות יאשר את המועד החדש בהקדם.',
        }
      }
    ),

    request_cancel: botTool(
      'מטפל בבקשת ביטול תור. אם מדובר בתור מאושר, מעביר את הבקשה לאישור הצוות. אם מדובר בהחזקה זמנית (Pending Hold), משחרר אותה מיידית.',
      z.object({
        appointmentId: z.string().optional().describe('מזהה התור לביטול אם ידוע או אם ללקוח יש מספר תורים פעילים'),
        details: z.string().optional().describe('מה הלקוח אמר לגבי הביטול'),
      }),
      async ({ appointmentId, details }) => {
        const activeAppointments = await getActiveAppointmentsForBot(su, customerId)
        if (activeAppointments.length === 0) {
          return {
            status: 'error',
            message: 'לא נמצא תור פעיל לביטול עבור הלקוח הזה. שאל/י לפרטים נוספים, או קרא/י ל-call_staff עם unhandled_query אם עדיין לא ברור.',
          }
        }

        // Multi-appointment disambiguation (Bug 10)
        let appointment = null
        if (appointmentId && appointmentId.trim()) {
          appointment = activeAppointments.find((a) => a.id === appointmentId.trim()) || null
        } else if (activeAppointments.length === 1) {
          appointment = activeAppointments[0]
        } else {
          // Multiple active appointments and none specified
          const summaryList = activeAppointments
            .map((a, idx) => {
              const d = new Date(a.start_time as string)
              const typeLabel = a.type === 'sketch' ? 'פגישת סקיצה' : 'קעקוע'
              const staffName = (a.expand?.staff)?.name || 'המקעקע'
              return `${idx + 1}. [מזהה: ${a.id}] ${typeLabel} בתאריך ${d.toLocaleDateString('he-IL')} בשעה ${minutesToTime(d.getHours() * 60 + d.getMinutes())} אצל ${staffName}`
            })
            .join('\n')

          return {
            status: 'clarification_needed',
            message: `ללקוח יש מספר תורים עתידיים פעילים:\n${summaryList}\n\nשאל/י את הלקוח באיזה מהתורים מדובר כדי שנוכל לטפל בביטול המדויק.`,
          }
        }

        if (!appointment) {
          return {
            status: 'error',
            message: 'לא נמצא תור פעיל התואם את המזהה שנמסר.',
          }
        }

        // Case 1: Pending Hold (AWAIT_PRICE_OFFER / AWAIT_PAYMENT) -> Release immediately without cutoff lockout (Bug 12)
        if (appointment.status === 'pending') {
          await cancelAppointmentForBot(su, appointment)
          await notifyStaff(
            'החזקה זמנית שוחררה לבקשת הלקוח',
            `הלקוח ביטל החזקה זמנית שטרם אושרה סופית.${details ? ` פירוט: ${details}` : ''}`,
            'info'
          )
          const nextState: ConversationState =
            conversationState === 'AWAITING_APPOINTMENT' ? 'COMPLETED' : 'COLLECTING_INFO'
          await transitionState(nextState, {
            reason: 'request_cancel_pending_hold',
            extraFields: { tattoo_info: null },
          })

          return {
            status: 'success',
            message: 'ההחזקה הזמנית שוחררה בהצלחה והמשבצת בוטלה. הודע/י ללקוח בנעימות שהפרטים בוטלו ושלא חויב בשום תשלום.',
          }
        }

        // Case 2: Confirmed Appointment
        const cutoffHours = ctx.runtimeConfig?.cancellation.cutoffHours ?? 48
        const hoursUntil = (new Date(appointment.start_time as string).getTime() - Date.now()) / (60 * 60 * 1000)
        const hasPaidDeposit =
          Boolean(appointment.deposit_paid) &&
          (Number(appointment.deposit_amount) > 0 || !('deposit_amount' in appointment))

        // Tier 1: Autonomous cancellation permitted when notice is >= cutoffHours (e.g. >= 48 hours)
        if (hoursUntil >= cutoffHours) {
          await cancelAppointmentForBot(su, appointment)

          const depositPolicyLine = hasPaidDeposit ? BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION : ''
          const depositSummary = depositStaffSummary(hasPaidDeposit ? Number(appointment.deposit_amount) || 0 : null, hoursUntil)

          await notifyStaff(
            'תור בוטל עצמאית על ידי הלקוח',
            `הלקוח ביטל תור מאושר (${new Date(appointment.start_time as string).toLocaleDateString('he-IL')}) מעל ${cutoffHours} שעות מראש. ${depositSummary}.${details ? ` פירוט: ${details}` : ''}`,
            'info',
            `/dashboard/conversations?chatId=${conversationId}`
          )

          await transitionState('COMPLETED', {
            reason: 'request_cancel_autonomous_confirmed',
            extraFields: { tattoo_info: null },
          })

          return {
            status: 'success',
            message: `התור בוטל בהצלחה במערכת וביומן.${depositPolicyLine} הודע ללקוח שהתור בוטל ושאם ירצה לקבוע מועד חדש נשמח לעזור לו.`,
          }
        }

        // Tier 2: Short Notice (< cutoffHours, e.g. < 48 hours) -> Escalate to human staff
        await updateConversation({
          status: 'escalated',
          is_staff_called: true,
          staff_call_reason: 'cancel_request',
        })

        const depositPolicyLine = hasPaidDeposit ? BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION : ''
        const depositSummary = depositStaffSummary(hasPaidDeposit ? Number(appointment.deposit_amount) || 0 : null, hoursUntil)

        await notifyStaff(
          `בקשת ביטול תור [דחוף: התראה קצרה - פחות מ-${cutoffHours} שעות!]`,
          `לקוח מבקש לבטל תור מאושר בהתראה קצרה (${new Date(appointment.start_time as string).toLocaleDateString('he-IL')}). ${depositSummary}.${details ? ` פירוט: ${details}` : ''}`,
          'warning',
          `/dashboard/conversations?chatId=${conversationId}`
        )

        return {
          status: 'handoff',
          message: `הביטול הוא בהתראה קצרה (פחות מ-${cutoffHours} שעות לפני התור) ולכן הועבר להחלטת נציג הסטודיו בדשבורד.${depositPolicyLine} הודע ללקוח בנעימות שמכיוון שמדובר בהתראה קצרה, הפנייה הועברה לבדיקת נציג אנושי שיחזור אליו בהקדם — אל תגיד שהתור כבר בוטל בפועל!`,
        }
      }
    ),
  }
}
