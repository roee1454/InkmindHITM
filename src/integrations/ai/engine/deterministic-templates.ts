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

export interface ArtistListItem {
  name: string
  portfolioUrl?: string | null
}

export interface ArtistsListTemplateParams {
  artists: ArtistListItem[]
}

export interface HealthDeclarationTemplateParams {
  formUrl: string
}

export const DETERMINISTIC_TEMPLATES = {
  artistsList: ({ artists }: ArtistsListTemplateParams): string => {
    const lines = artists.map((a) => {
      const linkPart = a.portfolioUrl ? ` - תיק עבודות: ${a.portfolioUrl}` : ''
      return `${a.name}${linkPart}`
    })
    return `יש לנו אמנים מעולים בסטודיו: 🖤\n\n${lines.join('\n')}\n\nעם מי מהם תרצה לקבוע ואיזה ימים נוחים לך?`
  },

  healthDeclarationNotice: ({ formUrl }: HealthDeclarationTemplateParams): string => {
    return `📝 הצהרת בריאות:\nלפני שנוכל לשריין את התור במערכת, יש למלא הצהרת בריאות קצרה ומאובטחת בקישור הבא:\n${formUrl}\n\nמיד עם מילוי הטופס נמשיך לסגירת התור ביומן! 🙌`
  },

  staffEscalated: (): string => {
    return 'העברתי את השיחה לבדיקת צוות הסטודיו. אחד המקעקעים או מנהל הסטודיו יחזור אליך כאן בהקדם האפשרי! 🙏'
  },

  sketchHeld: ({ artistName, dateYmd, timeSlot }: SketchTemplateParams): string => {
    const { dayName, formattedDate } = formatHebrewDateDetails(dateYmd, timeSlot)
    return `מעולה! שריינתי לך את המשבצת במערכת (יום ${dayName} ה-${formattedDate} בשעה ${timeSlot} אצל ${artistName}) והעברתי את הפרטים לבדיקת צוות הסטודיו. נחזור אליך כאן בהקדם עם אישור ופרטים לשריון! 🙌`
  },

  tattooHeld: ({ artistName, dateYmd, timeSlot }: TattooTemplateParams): string => {
    const { dayName, formattedDate } = formatHebrewDateDetails(dateYmd, timeSlot)
    return `מעולה! שריינתי לך את המשבצת במערכת (יום ${dayName} ה-${formattedDate} בשעה ${timeSlot} אצל ${artistName}) והעברתי את הפרטים לבדיקת צוות הסטודיו. נחזור אליך כאן בהקדם עם הצעת מחיר ופרטים לשריון! 🖤`
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

נשלח לך תזכורת מסודרת לפני התור. נתראה בקרוב! ✨`
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
