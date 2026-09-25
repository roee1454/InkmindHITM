import { z } from 'zod'
import type { ToolFactoryContext } from '../types'
import { checkAvailabilityForBot, getAvailableSlotsForBot } from '@/features/calendar/server/bot-appointments.server'

export function buildAvailabilityTools(ctx: ToolFactoryContext) {
  const { su, conversationState, transitionState, botTool } = ctx

  const availableSlotsToolDefinition = {
    description:
      'מחזיר שעות התחלה פנויות ומאומתות של אמן/ית לתור באורך המבוקש. מחשב מראש סלוטים מדויקים (start times) ומונע התנגשויות. כלל ברזל: תמיד יש להציע ללקוח אך ורק שעות התחלה ספציפיות מתוך הרשימה שהוחזרה, ולעולם לא טווח רציף כמו "בין 10:00 ל-13:00".',
    schema: z.object({
      staffId: z.string().describe('מזהה איש הצוות כפי שהתקבל מ-suggest_artists'),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך התחלה בפורמט YYYY-MM-DD'),
      days: z.number().int().min(1).max(30).default(7).describe('מספר הימים לבדיקת זמינות קדימה (ברירת מחדל 7)'),
      durationHours: z.number().min(0.5).max(24).default(2).describe('משך התור המבוקש בשעות (למשל: 0.5 לפגישת סקיצה של 30 דק, או 2-3.5 לקעקוע)'),
      type: z.enum(['tattoo', 'sketch']).optional().describe('סוג התור: tattoo לקעקוע (ברירת מחדל 2 שעות) או sketch לפגישת סקיצה (ברירת מחדל 0.5 שעות)'),
    }),
    handler: async ({ staffId, fromDate, days = 7, durationHours = 2, type }: {
      staffId: string
      fromDate: string
      days?: number
      durationHours?: number
      type?: 'tattoo' | 'sketch'
    }) => {
      const effectiveDuration = type === 'sketch' && durationHours === 2 ? 0.5 : durationHours
      if (conversationState === 'WANTS_TO_BOOK' || conversationState === 'NEW') {
        await transitionState('COLLECTING_INFO', {
          reason: 'get_available_slots',
          extraFields: {
            tattoo_info: {
              appointmentType: type || (effectiveDuration <= 0.75 ? 'sketch' : 'tattoo'),
            },
          },
        }).catch(() => null)
      }
      const result = await getAvailableSlotsForBot(su, {
        staffId,
        fromDate,
        days,
        durationHours: effectiveDuration,
      })

      if (result.totalSlotsFound === 0) {
        return {
          status: 'unavailable',
          message: `לא נמצאו שעות התחלה פנויות לתור של ${effectiveDuration} שעות בטווח התאריכים המבוקש. הצע ללקוח טווח תאריכים אחר או אמן נוסף מהסטודיו.`,
          data: result,
        }
      }

      const daysFormatted = result.availableDays
        .map((d) => `- ${d.summaryHebrew}`)
        .join('\n')

      return {
        status: 'success',
        message: `נמצאו שעות התחלה פנויות ומאומתות לתור של ${effectiveDuration} שעות אצל ${result.artistName}:
${daysFormatted}

הנחיות חשובות למענה:
1. השעות שהוצגו הן דוגמאות מומלצות ומפוזרות (בוקר, צהריים, אחה״צ).
2. אם צוין שהיומן פנוי לאורך כל היום — ציין זאת מפורשות ללקוח!
הצעה מוכנה לשימוש:
"${result.readyToUseProposal}"
3. אם הלקוח שואל "הוא לא פנוי כל היום?", שואל על חלק אחר ביום (כמו אחה״צ או ערב), או מציין שהמקעקע פנוי: אל תטען בטעות שהוא תפוס! אשר שהיומן פנוי לאורך שעות הפעילות ושאל איזו שעה נוחה לו.
4. אין לפנות לצוות (call_staff) על שאלות שעות או זמינות ביום פנוי.`,
        data: result,
      }
    },
  }

  return {
    check_availability: botTool(
      'בודק אם משבצת זמן ספציפית פנויה אצל אמן מסוים. יש להשתמש בכלי זה לפני יצירת הזמנה. אם המשבצת תפוסה, הכלי מחזיר אוטומטית שעות התחלה פנויות חלופיות באותו יום.',
      z.object({
        staffId: z.string().describe('מזהה איש הצוות'),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'תאריך חייב להיות בפורמט YYYY-MM-DD').describe('תאריך בפורמט YYYY-MM-DD'),
        timeSlot: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'שעה חייבת להיות בפורמט HH:MM בטווח 24 שעות').describe('שעה בפורמט HH:MM'),
        durationHours: z.number().min(0.5).max(24).default(2).describe('משך התור המבוקש בשעות (למשל: 0.5 לפגישת סקיצה של 30 דק, או 2-3.5 לקעקוע)'),
        type: z.enum(['tattoo', 'sketch']).optional().describe('סוג התור: tattoo לקעקוע (ברירת מחדל 2 שעות) או sketch לפגישת סקיצה (ברירת מחדל 0.5 שעות)'),
        allowException: z.boolean().default(false).describe('יש להגדיר true אך ורק אם איש צוות/אמן הציע או אישר במפורש בהיסטוריית השיחה את השעה הזו, כדי לעקוף אילוצי מערכת.'),
      }),
      async ({ staffId, date, timeSlot, durationHours = 2, type, allowException }) => {
        const effectiveDuration = type === 'sketch' && durationHours === 2 ? 0.5 : durationHours
        if (conversationState === 'WANTS_TO_BOOK' || conversationState === 'NEW') {
          await transitionState('COLLECTING_INFO', {
            reason: 'check_availability',
            extraFields: {
              tattoo_info: {
                appointmentType: type || (effectiveDuration <= 0.75 ? 'sketch' : 'tattoo'),
              },
            },
          }).catch(() => null)
        }
        const result = await checkAvailabilityForBot(su, { staffId, date, timeSlot, durationHours: effectiveDuration, allowException })
        const altText = result.alternativeSlots && result.alternativeSlots.length > 0
          ? ` שעות התחלה פנויות באותו יום (${date}): ${result.alternativeSlots.join(', ')}. הצע ללקוח שעות אלו.`
          : ' אין שעות התחלה פנויות נוספות באותו יום. הצע ללקוח לבדוק יום אחר.'

        const messages: Record<typeof result.reason, string> = {
          available: result.suggestedPhrasing || 'המשבצת פנויה. ניתן להמשיך לאיסוף פרטי הקעקוע אם הלקוח מעוניין.',
          outside_working_hours: `המשבצת ${timeSlot} מחוץ לשעות הפעילות של האמן עבור תור של ${effectiveDuration} שעות.${altText}`,
          slot_taken: `המשבצת ${timeSlot} תפוסה (תור של ${effectiveDuration} שעות מתנגש עם תור קיים).${altText}`,
          no_working_hours_configured: 'לא הוגדרו שעות עבודה לאמן זה — יש להעביר את הטיפול לצוות עם call_staff (סיבה: slot_conflict).',
          invalid_staff_id: 'staffId לא תקין — קרא ל-suggest_artists וקבל ממנו את המזהה המדויק.',
          date_in_past: 'התאריך והשעה האלה כבר עברו. בדוק שוב את התאריך והצע מועד עתידי.',
          studio_closed: 'הסטודיו סגור בתאריך זה. הודע ללקוח והצע מועד אחר.',
        }
        return {
          status: result.available ? 'success' : 'unavailable',
          message: messages[result.reason],
          suggestedPhrasing: result.suggestedPhrasing,
          data: {
            ...result,
            alternativeSlots: result.alternativeSlots || [],
          },
        }
      }
    ),

    get_artist_schedule: botTool(
      availableSlotsToolDefinition.description,
      availableSlotsToolDefinition.schema,
      availableSlotsToolDefinition.handler,
    ),

    get_available_slots: botTool(
      availableSlotsToolDefinition.description,
      availableSlotsToolDefinition.schema,
      availableSlotsToolDefinition.handler,
    ),
  }
}
