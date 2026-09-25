import type { ToolFactoryContext } from '../tools/types'
import { fromYmd } from '@/lib/date-utils'

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export const STUDIO_LOCATION_TEXT = 'שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

export function formatHebrewDateDetails(dateYmd: string, timeSlot: string): {
  dayName: string
  formattedDate: string
  timeSlot: string
} {
  const d = fromYmd(dateYmd)
  const dayName = HEBREW_DAYS[d.getDay()] || 'ראשון'
  const day = d.getDate()
  const month = d.getMonth() + 1
  const formattedDate = `${day}.${month}`

  return {
    dayName,
    formattedDate,
    timeSlot,
  }
}

export interface SketchTemplateParams {
  artistName: string
  dateYmd: string
  timeSlot: string
}

export interface TattooTemplateParams {
  artistName: string
  dateYmd: string
  timeSlot: string
}

export interface BookingConfirmedTemplateParams {
  artistName: string
  dateYmd: string
  timeSlot: string
  studioName?: string
}

export const DETERMINISTIC_TEMPLATES = {
  sketchHeld: ({ artistName, dateYmd, timeSlot }: SketchTemplateParams): string => {
    const { dayName, formattedDate } = formatHebrewDateDetails(dateYmd, timeSlot)
    return `סגור לגמרי, קבענו פגישת סקיצה וייעוץ! ✨

🗓 מתי: יום ${dayName} ה-${formattedDate} בשעה ${timeSlot}
⏱ משך משוער: כ-30 דקות
🎨 מקעקע/ת: ${artistName}
📍 איפה: ${STUDIO_LOCATION_TEXT}

הפרטים שמורים ביומן, נחזור אליך כאן לקראת המפגש לתכנון הסקיצה המושלמת מול המקעקע!`
  },

  tattooHeld: ({ artistName, dateYmd, timeSlot }: TattooTemplateParams): string => {
    const { dayName, formattedDate } = formatHebrewDateDetails(dateYmd, timeSlot)
    return `איזה יופי, שריינתי לך את התור במערכת! 🖤

🗓 מתי: יום ${dayName} ה-${formattedDate} בשעה ${timeSlot}
🎨 מקעקע/ת: ${artistName}
📍 איפה: ${STUDIO_LOCATION_TEXT}

העברתי את הפרטים למקעקע/ת לבדיקת הסקיצה והגודל. נחזור אליך כאן בהקדם עם הצעת מחיר מדויקת ופרטים לשריון סופי!`
  },

  waitlistJoined: (): string => {
    return `מעולה, רשמתי אותך ברשימת ההמתנה שלנו! 💫

ברגע שיתפנה מועד מתאים (למשל בעקבות ביטול או שינוי), נשלח לך כאן הודעה ראשונים כדי לתפוס אותו.
אם יש לך שאלות או רעיון חדש בינתיים, אנחנו תמיד כאן!`
  },

  bookingConfirmed: ({ artistName, dateYmd, timeSlot }: BookingConfirmedTemplateParams): string => {
    const { dayName, formattedDate } = formatHebrewDateDetails(dateYmd, timeSlot)
    return `איזה כיף, התור שלך נקבע רשמית! 🎉

🗓 מתי: יום ${dayName} ה-${formattedDate} בשעה ${timeSlot}
🎨 מקעקע/ת: ${artistName}
📍 איפה: ${STUDIO_LOCATION_TEXT}

נשלח לך תזכורת מסודרת לפני התור. אגב, אם יתפנה מועד קרוב יותר עקב ביטול, תרצה/י שנציע לך להקדים?`
  },
}

/**
 * Dispatches a deterministic template message directly via WhatsApp and PocketBase,
 * marking `ctx.didSendMessage = true` so the bot turn completes without redundant LLM text.
 */
export async function sendDeterministicMessage(
  ctx: ToolFactoryContext,
  text: string,
): Promise<{ sent: boolean; text: string }> {
  const { su, conversationId, waClient, customerPhone } = ctx
  if (!waClient || !customerPhone) {
    return { sent: false, text }
  }

  try {
    const { wamid } = await waClient.sendText({ to: customerPhone, body: text })
    ctx.didSendMessage = true

    const nowIso = new Date().toISOString()
    await Promise.all([
      su.collection('messages').create({
        conversation: conversationId,
        whatsapp_message_id: wamid,
        direction: 'outbound',
        sender_type: 'ai_bot',
        type: 'text',
        body: text,
        status: 'sent',
        timestamp: nowIso,
        seen: true,
      }),
      su.collection('conversations').update(conversationId, {
        last_message_at: nowIso,
      }).catch(() => null),
    ])

    return { sent: true, text }
  } catch (err) {
    console.error('[sendDeterministicMessage] Failed to send template text:', err)
    return { sent: false, text }
  }
}
