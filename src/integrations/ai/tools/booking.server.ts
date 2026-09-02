import { z } from 'zod'
import type { ToolFactoryContext } from './types'
import {
  checkAvailabilityForBot,
  getArtistScheduleForBot,
  createPendingHoldForBot,
  getActiveAppointmentForBot,
  cancelAppointmentForBot,
} from '@/features/calendar/server/bot-appointments'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import type { ConversationState } from '../prompts'

export function buildBookingTools(ctx: ToolFactoryContext) {
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
    check_availability: botTool(
      'בודק אם משבצת זמן ספציפית פנויה אצל אמן/ית מסוים/ת. תמיד יש להשתמש בכלי זה לפני יצירת הזמנה, ולעולם לא להניח שמשבצת פנויה.',
      z.object({
        staffId: z.string().describe('מזהה איש הצוות'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך בפורמט YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה חייבת להיות בפורמט HH:MM בטווח 24 שעות').describe('שעה בפורמט HH:MM'),
        durationHours: z.number().min(0.5).max(24).default(2).describe('משך התור המבוקש בשעות (למשל: 2 או 3.5)'),
      }),
      async ({ staffId, date, timeSlot, durationHours }) => {
        const result = await checkAvailabilityForBot(su, { staffId, date, timeSlot, durationHours })
        const messages: Record<typeof result.reason, string> = {
          available: 'המשבצת פנויה. ניתן להמשיך לאיסוף פרטי הקעקוע אם הלקוח מעוניין.',
          outside_working_hours: 'המשבצת מחוץ לשעות הפעילות של האמן/ית — הצע/י ללקוח משבצת אחרת.',
          slot_taken: 'המשבצת תפוסה כבר. הצע/י ללקוח משבצת אחרת ובדוק/י אותה שוב עם כלי זה.',
          no_working_hours_configured: 'לא הוגדרו שעות עבודה לאמן/ית הזה/ו — יש להעביר את הטיפול לצוות עם call_staff (סיבה: slot_conflict).',
          invalid_staff_id: 'staffId לא תקין — לעולם אל תמציאו או תעבירו שם אמן במקום מזהה. קראו ל-suggest_artists וקבלו ממנו את המזהה המדויק.',
          date_in_past: 'התאריך והשעה האלה כבר עברו! כנראה חישבת תאריך יחסי לא נכון. חזור/י לבלוק "הקשר זמן" שבהנחיות, חשב/י מחדש את התאריך שהלקוח ביקש, והצע/י מועד עתידי.',
          studio_closed: 'הסטודיו סגור בתאריך זה. הודע/י ללקוח בנימוס והצע/י מועד אחר.',
        }
        return { status: result.available ? 'success' : 'unavailable', message: messages[result.reason], data: result }
      }
    ),

    get_artist_schedule: botTool(
      'מחזיר את יומן ההזמנות הקיים של אמן/ית יחד עם שעות הפעילות המוגדרות שלו, כדי להציע ללקוח משבצות פנויות מתאימות.',
      z.object({
        staffId: z.string().describe('מזהה איש הצוות'),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך התחלה בפורמט YYYY-MM-DD'),
        days: z.number().int().min(1).max(30).default(14).describe('מספר הימים לבדיקת יומן האמן קדימה'),
      }),
      async ({ staffId, fromDate, days }) => {
        const [schedule, workingHours] = await Promise.all([
          getArtistScheduleForBot(su, { staffId, fromDate, days }),
          getWorkingHoursForStaff(su, staffId),
        ])

        const daysMap = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
        const formattedHours = workingHours.map((w) => ({
          day: daysMap[w.dayOfWeek] || String(w.dayOfWeek),
          startTime: w.startTime,
          endTime: w.endTime,
        }))

        return {
          status: 'success',
          message: 'אלו המשבצות התפוסות ושעות הפעילות של האמן. כל שעה שאינה תפוסה ונמצאת בתוך שעות הפעילות נחשבת פנויה. ימים שאינם מופיעים בשעות הפעילות מוגדרים כסגורים (האמן אינו עובד בהם). יש לוודא זמינות ספציפית עם check_availability לפני הזמנה.',
          data: {
            bookedAppointments: schedule,
            workingHours: formattedHours,
          },
        }
      }
    ),

    collect_tattoo_info: botTool(
      'יוצר החזקה זמנית (pending) על משבצת זמן לאחר שהלקוח סיפק תיאור קעקוע, מיקום על הגוף, אמן/ית, תאריך ושעה, ואישר את הסיכום. הכלי מוודא שוב את זמינות המשבצת בעצמו — אין להניח שהיא פנויה גם אם check_availability הוחזר "success" קודם בשיחה.',
      z.object({
        designDescription: z.string().min(1).describe('תיאור קצר ומפורט של רעיון הקעקוע, הסגנון והאלמנטים לעיצוב'),
        placementSpot: z.string().min(1).describe('מיקום מיועד בגוף של הלקוח (למשל: יד אחורית, רגל, שכם)'),
        staffId: z.string().describe('מזהה האמן שנבחר על ידי הלקוח לביצוע הקעקוע (staffId)'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך שנבחר לתור בפורמט YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה חייבת להיות בפורמט HH:MM בטווח 24 שעות').describe('שעת תחילת התור בפורמט HH:MM'),
        durationHours: z.number().min(0.5).max(24).default(2).describe('משך התור המוערך בשעות (למשל: 2 או 3.5)'),
        customerDeclinedPhotos: z.boolean().default(false)
          .describe('true רק אם נשאל במפורש ואין לו/מסרב לשלוח תמונת השראה או תמונת מיקום'),
      }),
      async ({ designDescription, placementSpot, staffId, date, timeSlot, durationHours, customerDeclinedPhotos }) => {
        let hasInspirationPhoto = false
        if (!customerDeclinedPhotos) {
          const hasPhoto = await su.collection('messages').getList(1, 1, {
            filter: `conversation = "${conversationId}" && direction = "inbound" && type = "image"`,
          }).then(r => r.totalItems > 0)
          if (!hasPhoto) {
            return {
              status: 'missing_inspiration_photo',
              message: 'לא נמצאה תמונת השראה בהיסטוריית השיחה. אם הלקוח שלח תמונה ממש עכשיו, ייתכן שיש עיכוב קל בקליטה של מספר שניות. בקשו ממנו להמתין רגע, או בדקו איתו בנימוס אם הוא יכול לשלוח אותה שוב. אם הלקוח מסרב או אומר שאין לו תמונה, קראו לכלי זה שוב עם customerDeclinedPhotos: true.'
            }
          }
          hasInspirationPhoto = true
        }

        const result = await createPendingHoldForBot(su, {
          customerId,
          staffId,
          date,
          timeSlot,
          durationHours,
          tattooDescription: `${designDescription} (מיקום: ${placementSpot})`,
        })
        if (result.status === 'slot_taken') {
          return {
            status: 'error',
            message: 'המשבצת התפוסה בפועל בזמן הבדיקה החוזרת. הצע/י ללקוח משבצת אחרת ונסה/י שוב.',
          }
        }
        if (result.status === 'invalid_staff_id') {
          return {
            status: 'error',
            message: 'staffId לא תקין — לעולם אל תמציאו או תעבירו שם אמן במקום מזהה. קראו ל-suggest_artists וקבלו ממנו את המזהה המדויק.',
          }
        }
        if (result.status === 'date_in_past') {
          return {
            status: 'error',
            message: 'התאריך והשעה של התור כבר עברו — אי אפשר לקבוע תור בעבר. חזור/י לבלוק "הקשר זמן", חשב/י מחדש את התאריך, ואשר/י מועד עתידי מול הלקוח לפני קריאה חוזרת.',
          }
        }
        if (result.status === 'studio_closed') {
          return {
            status: 'error',
            message: 'הסטודיו סגור בתאריך זה. הודע/י ללקוח בנימוס והצע/י מועד אחר.',
          }
        }
        await transitionState('AWAIT_PRICE_OFFER', {
          reason: 'collect_tattoo_info',
          extraFields: {
            tattoo_info: {
              designDescription,
              placementSpot,
              staffId,
              date,
              timeSlot,
              durationHours,
              customerDeclinedPhotos,
              hasInspirationPhoto,
            },
          },
        })
        if (result.status === 'created') {
          const customer = await su.collection('customers').getOne(customerId).catch(() => null)
          // Links to the conversation, not the calendar (HITL-2): pricing now happens
          // on the inline card inside the thread — sending staff away from the chat
          // they just read was the core HITL friction.
          await notifyStaff(
            'בקשת הזמנה חדשה — ממתינה להצעת מחיר',
            `${customer?.name || 'לקוח'} מבקש/ת ${designDescription} (${placementSpot}) בתאריך ${date} בשעה ${timeSlot}. הזן מחיר ומקדמה בכרטיס שבראש השיחה.`,
            'info',
            `/dashboard/conversations?chatId=${conversationId}`
          )
        }
        return {
          status: 'success',
          message:
            result.status === 'already_pending'
              ? 'כבר קיימת החזקה ממתינה על משבצת זו. הודע/י ללקוח שהפרטים נקלטו וצוות הסטודיו יאשר את ההזמנה.'
              : 'ההחזקה נוצרה בהצלחה כ"ממתינה". הודע/י ללקוח שהפרטים נקלטו וצוות הסטודיו יחזור אליו/ה לאישור ותשלום מקדמה. אין לאשר את ההזמנה בעצמך.',
          data: { appointmentId: result.appointmentId },
        }
      }
    ),

    confirm_booking_final: botTool(
      'נועל את התור סופית (status confirmed) לאחר שהלקוח אישר בפירוש את כל פרטי ההזמנה (תאריך, שעה, מחיר, מקדמה) בהודעת האישור האחרונה. אין לקרוא לכלי זה אם הלקוח מבקש לשנות משהו — במקרה כזה השתמשו ב-call_staff.',
      z.object({}),
      async () => {
        const appointment = await getActiveAppointmentForBot(su, customerId)
        if (!appointment || appointment.status !== 'pending') {
          return {
            status: 'error',
            message: 'לא נמצא תור במצב ממתין (pending) לאישור. קראו ל-call_staff עם unhandled_query.',
          }
        }
        await Promise.all([
          su.collection('appointments').update(appointment.id, { status: 'confirmed' }),
          transitionState('AWAITING_APPOINTMENT', { reason: 'confirm_booking_final' }),
        ])

        // Google Calendar sync fires from the appointments PocketBase hook
        // (pocketbase/pb_hooks/appointments.pb.js) reacting to the update above.
        return {
          status: 'success',
          message: 'התור ננעל סופית! אשר/י זאת בחום ובהתלהבות ללקוח.',
        }
      }
    ),

    request_reschedule: botTool(
      'מעביר בקשת שינוי מועד לצוות האנושי. לפני הקריאה לכלי, שאלו את הלקוח מה המועד המועדף עליו.',
      z.object({
        details: z.string().min(1).describe("המועד המועדף החדש של הלקוח ופרטים נוספים"),
      }),
      async ({ details }) => {
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
      'מבטל תור קיים אם הביטול מחוץ לחלון הביטול של הסטודיו, אחרת מעביר את הבקשה לצוות לטיפול אנושי.',
      z.object({
        details: z.string().optional().describe('מה הלקוח אמר לגבי הביטול'),
      }),
      async ({ details }) => {
        const appointment = await getActiveAppointmentForBot(su, customerId)
        if (!appointment) {
          return {
            status: 'error',
            message: 'לא נמצא תור פעיל לביטול עבור הלקוח הזה. שאל/י לפרטים נוספים, או קרא/י ל-call_staff עם unhandled_query אם עדיין לא ברור.',
          }
        }

        const policy = await getStudioPolicyForBot(su)
        const hoursUntil = (new Date(appointment.start_time as string).getTime() - Date.now()) / (60 * 60 * 1000)
        const hasPaidDeposit = appointment.status === 'confirmed'
        const depositLine = hasPaidDeposit
          ? ' ציין/י ללקוח בעדינות שהמקדמה ששולמה אינה ניתנת להחזר לפי מדיניות הסטודיו.'
          : ''

        if (hoursUntil < policy.cancellationCutoffHours) {
          await updateConversation({
            status: 'escalated',
            is_staff_called: true,
            staff_call_reason: 'cancel_request',
          })
          await notifyStaff(
            'בקשת ביטול בתוך חלון הביטול',
            `בקשת ביטול בתוך חלון ${policy.cancellationCutoffHours} השעות של הסטודיו.${details ? ` ${details}` : ''}`
          )
          return {
            status: 'handoff',
            message: `הביטול בתוך חלון ${policy.cancellationCutoffHours} השעות, לכן נדרש טיפול אנושי. הודע/י ללקוח בחום שחבר/ת צוות ייקח/תיקח את זה מכאן ותחזור/תחזרו בהקדם — אל תגיד/י שהתור כבר בוטל.${depositLine}`,
          }
        }

        await cancelAppointmentForBot(su, appointment)
        await notifyStaff('תור בוטל דרך הבוט', `התור בוטל דרך הבוט לבקשת הלקוח.${details ? ` פירוט: ${details}` : ''}`, 'info')

        const nextState: ConversationState = conversationState === 'AWAITING_APPOINTMENT' ? 'COMPLETED' : 'COLLECTING_INFO'
        await transitionState(nextState, { reason: 'request_cancel' })

        return {
          status: 'success',
          message: `התור בוטל בהצלחה והמשבצת שוחררה. אשר/י זאת בחום ללקוח.${depositLine}`,
        }
      }
    ),

    flag_earlier_preference: botTool(
      'מוסיף את הלקוח לרשימת המתנה למשבצת מוקדמת יותר מהתור הקיים שלו. יש להשתמש בכלי זה כשהלקוח מביע רצון למועד מוקדם יותר מהתור שכבר נקבע לו, גם אם כרגע אין משבצת כזו פנויה — אם תתפנה משבצת מתאימה, הצוות ייצור איתו קשר.',
      z.object({
        notBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('לא לפני תאריך זה בפורמט YYYY-MM-DD — אם לא צוין, מהיום'),
      }),
      async ({ notBefore }) => {
        const appointment = await getActiveAppointmentForBot(su, customerId)
        if (!appointment) {
          return { status: 'error', message: 'לא נמצא תור פעיל ללקוח הזה כרגע — אי אפשר להוסיף לרשימת המתנה.' }
        }
        const existing = await su
          .collection('waitlist_entries')
          .getFirstListItem(`customer = "${customerId}" && status = "watching"`)
          .catch(() => null)
        if (existing) {
          return { status: 'success', message: 'הלקוח כבר ברשימת ההמתנה למשבצת מוקדמת יותר — אין צורך להוסיף שוב.' }
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
  }
}
