import { z } from 'zod'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import type { ToolFactoryContext } from '../types'
import { canTransition } from '@/features/conversations/server/state-machine'
import { createPendingHoldForBot, getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { sanitizePromptText } from '@/lib/sanitization'
import { syncAppointmentToGoogle } from '@/integrations/google-calendar/server/google-sync.server'
import { DETERMINISTIC_TEMPLATES, sendDeterministicMessage } from '../../engine/deterministic-templates'
import { isHoldReadyToConfirm } from '../fact-guards'
import { followUpStaffNote } from '../booking-scope'
import type { BookingScope, TouchUpTerms } from '../booking-scope'
import { loadProjectPolicy } from '@/features/settings/server/project-policy'

export function buildBookingCreationTools(ctx: ToolFactoryContext) {
  const { su, conversationId, customerId, transitionState, notifyStaff, botTool } = ctx

  return {
    collect_tattoo_info: botTool(
      'יוצר החזקה זמנית (pending) על משבצת זמן לאחר שהלקוח סיפק תיאור קעקוע, מיקום על הגוף, אמן/ית, תאריך ושעה, ואישר את הסיכום. בפגישת סקיצה (sketch) — מיקום ועיצוב מוגמר אינם חובה (ניתן להעביר "טרם נקבע" / "ייקבע בפגישה"). הכלי מוודא שוב את זמינות המשבצת בעצמו — אין להניח שהיא פנויה גם אם check_availability הוחזר "success" קודם בשיחה.',
      z.object({
        type: z.enum(['tattoo', 'sketch']).optional().describe('סוג התור: tattoo לקעקוע רגיל, או sketch לפגישת סקיצה/ייעוץ'),
        designDescription: z.string().default('ייקבע בפגישה').describe('תיאור קצר של רעיון הקעקוע. בפגישת סקיצה — ניתן להעביר רעיון כללי או "ייקבע בפגישה"'),
        placementSpot: z.string().default('טרם נקבע').describe('מיקום מיועד בגוף של הלקוח. בפגישת סקיצה — אם הלקוח לא סגור על מיקום, יש להעביר "טרם נקבע"'),
        staffId: z.string().describe('מזהה האמן שנבחר על ידי הלקוח לביצוע הקעקוע (staffId)'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך שנבחר לתור בפורמט YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה חייבת להיות בפורמט HH:MM בטווח 24 שעות').describe('שעת תחילת התור בפורמט HH:MM'),
        durationHours: z.number().min(0.5).max(24).default(2).describe('משך התור המוערך בשעות (למשל: 0.5 לפגישת סקיצה של 30 דק\', או 2-3.5 לקעקוע)'),
        customerDeclinedPhotos: z.boolean().default(false)
          .describe('true רק אם נשאל במפורש ואין לו/מסרב לשלוח תמונת השראה או תמונת מיקום'),
        allowException: z.boolean().default(false)
          .describe('יש להגדיר true אך ורק אם איש צוות/אמן הציע או אישר במפורש בהיסטוריית השיחה את השעה הזו, כדי לעקוף אילוצי מערכת.'),
      }),
      async ({ type, designDescription, placementSpot, staffId, date, timeSlot, durationHours = 2, customerDeclinedPhotos, allowException }) => {
        const conversationRecord = await su.collection('conversations').getOne(conversationId).catch(() => null)
        const convTattooInfo = conversationRecord?.tattoo_info as Record<string, unknown> | undefined
        const isExplicitSketch =
          type === 'sketch' ||
          convTattooInfo?.appointmentType === 'sketch'

        const finalType: 'tattoo' | 'sketch' = isExplicitSketch ? 'sketch' : (type || (convTattooInfo?.appointmentType as 'tattoo' | 'sketch') || 'tattoo')
        const effectiveDuration = finalType === 'sketch' && (durationHours === 2 || !durationHours) ? 0.5 : durationHours
        const cleanDesignDescription = sanitizePromptText(designDescription || (finalType === 'sketch' ? 'פגישת סקיצה וייעוץ' : 'קעקוע כללי'), 300)
        const cleanPlacementSpot = sanitizePromptText(placementSpot || 'טרם נקבע', 100)
        // Set by start_booking: the next session or a touch-up of a piece the studio already has.
        const bookingScope = convTattooInfo?.bookingScope as BookingScope | undefined
        const touchUpTermsChosen = convTattooInfo?.touchUpTerms as TouchUpTerms | undefined
        const isFollowUp = bookingScope === 'next_session' || bookingScope === 'touch_up'

        let hasInspirationPhoto = false
        // The studio already has the piece for a next session or a touch-up: no inspiration photo needed.
        if (!customerDeclinedPhotos && finalType !== 'sketch' && !isFollowUp) {
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
        } else if (finalType === 'sketch') {
          const hasPhoto = await su.collection('messages').getList(1, 1, {
            filter: `conversation = "${conversationId}" && direction = "inbound" && type = "image"`,
          }).then(r => r.totalItems > 0)
          hasInspirationPhoto = hasPhoto
        }

        // Checked before the hold exists: a move the state machine refuses must not leave an orphan hold.
        if (!canTransition(ctx.conversationState, 'AWAIT_PRICE_OFFER', 'bot')) {
          return {
            status: 'error',
            message: `לא ניתן לשריין משבצת בשלב הנוכחי של השיחה (${ctx.conversationState}). אל תאשר ללקוח שהתור נשמר; אם הלקוח רוצה לקבוע תור חדש, קרא ל-start_booking.`,
          }
        }
        const result = await createPendingHoldForBot(su, {
          customerId,
          staffId,
          date,
          timeSlot,
          durationHours: effectiveDuration,
          type: finalType,
          ...(bookingScope === 'touch_up' ? { kind: 'touch_up' as const } : {}),
          allowException,
          tattooDescription: finalType === 'sketch'
            ? (cleanDesignDescription.startsWith('פגישת סקיצה') ? cleanDesignDescription : `פגישת סקיצה: ${cleanDesignDescription}`) + ` (מיקום: ${cleanPlacementSpot})`
            : `${cleanDesignDescription} (מיקום: ${cleanPlacementSpot})`,
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
            status: 'staff_handling',
            tattoo_info: {
              appointmentType: finalType,
              designDescription: cleanDesignDescription,
              placementSpot: cleanPlacementSpot,
              staffId,
              date,
              timeSlot,
              durationHours: effectiveDuration,
              customerDeclinedPhotos,
              hasInspirationPhoto,
              ...(bookingScope ? { bookingScope } : {}),
              ...(touchUpTermsChosen ? { touchUpTerms: touchUpTermsChosen } : {}),
            },
          },
        })
        if (result.status === 'created') {
          const customer = await su.collection('customers').getOne(customerId).catch(() => null)
          // Links to the conversation, not the calendar (HITL-2): pricing now happens
          // on the inline card inside the thread — sending staff away from the chat
          // they just read was the core HITL friction.
          const isSketch = finalType === 'sketch'
          const note = followUpStaffNote(bookingScope, touchUpTermsChosen, (await loadProjectPolicy(su)).depositPerSession)
          await notifyStaff(
            note?.title ?? (isSketch ? 'בקשת פגישת סקיצה חדשה — ממתינה לאישור' : 'בקשת הזמנה חדשה — ממתינה להצעת מחיר'),
            `${customer?.name || 'לקוח'} מבקש/ת ${isSketch ? 'פגישת סקיצה עבור' : ''} ${cleanDesignDescription} (${cleanPlacementSpot}) בתאריך ${date} בשעה ${timeSlot}. ${note?.detail ?? 'הזן מחיר ומקדמה בכרטיס שבראש השיחה.'}`,
            'info',
            `/dashboard/conversations?chatId=${conversationId}`
          )

          const artist = staffId ? await su.collection('staff').getOne(staffId).catch(() => null) : null
          const artistName = (artist?.name as string) || 'אמן הסטודיו'

          if (isSketch) {
            const text = DETERMINISTIC_TEMPLATES.sketchHeld({ artistName, dateYmd: date, timeSlot })
            await sendDeterministicMessage(ctx, text)
          } else {
            const text = DETERMINISTIC_TEMPLATES.tattooHeld({ artistName, dateYmd: date, timeSlot })
            await sendDeterministicMessage(ctx, text)
          }
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
        if (!isHoldReadyToConfirm(appointment)) {
          return {
            status: 'error',
            message: 'לא ניתן לאשר את התור סופית עדיין — יש להמתין לאישור קבלת המקדמה על ידי צוות הסטודיו.',
          }
        }
        // Checked before locking the appointment, so a refused move doesn't leave it confirmed behind
        // a conversation that still thinks it's being booked.
        if (!canTransition(ctx.conversationState, 'AWAITING_APPOINTMENT', 'bot')) {
          return { status: 'error', message: "השיחה לא בשלב אישור ההזמנה. קרא/י ל-'call_staff' עם unhandled_query." }
        }
        await Promise.all([
          su.collection('appointments').update(appointment.id, statusChange('confirmed', 'bot', 'confirm_booking_final')),
          transitionState('AWAITING_APPOINTMENT', { reason: 'confirm_booking_final' }),
        ])

        // Google Calendar sync fires from the appointments PocketBase hook
        // (pocketbase/pb_hooks/appointments.pb.js) reacting to the update above.
        // Sync confirmed appointment to Google Calendar (Bug 21)
        try {
          await syncAppointmentToGoogle(appointment.id)
        } catch (syncErr) {
          console.error('[confirm_booking_final] Google sync failed:', syncErr)
        }

        const staff = appointment.staff ? await su.collection('staff').getOne(appointment.staff as string).catch(() => null) : null
        const artistName = (staff?.name as string) || 'צוות הסטודיו'
        const startDate = new Date(appointment.start_time as string)
        const dateYmd = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
        const timeSlot = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
        const text = DETERMINISTIC_TEMPLATES.bookingConfirmed({
          artistName,
          dateYmd,
          timeSlot,
        })
        await sendDeterministicMessage(ctx, text)

        return {
          status: 'success',
          message: 'התור ננעל סופית! אשר/י זאת בחום ובהתלהבות ללקוח.',
        }
      }
    ),
  }
}
