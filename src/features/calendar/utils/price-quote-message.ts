import type { DepositPerSession } from '@/lib/project-policy'
import { perSessionDepositNote } from '@/lib/customer-finance-wording'

/**
 * The WhatsApp message staff send with an appointment's quote: when, with whom, how long, the price,
 * the deposit, and for a tattoo how much of the work this is — so the customer knows up front that a
 * piece spreads over several sessions. The number of sessions is the artist's estimate, entered with
 * the quote; the bot never decides it. Prices are per session, the studio's pricing model
 * (docs/projects-payments/track-a-after-client-call.md, A3).
 */
export interface PriceQuoteMessageInput {
  isSketch: boolean
  needsHealthDeclaration: boolean
  /** e.g. "שלישי, 14.10 בשעה 12:00" */
  when: string
  staffName: string
  durationLabel: string
  priceMin: number
  priceMax: number
  depositAmount: number | null
  /** Tattoo only: the artist's estimate, or null when they don't know yet. */
  estimatedSessions: number | null
  healingPeriodDays: number
  depositPerSession: DepositPerSession
  paymentInstructions: string | null
  cancellationPolicyText: string
  healthFormUrl: string
}

const LOCATION_LINE = '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

export function healingGapLabel(days: number): string {
  if (days === 7) return 'כשבוע'
  if (days === 14) return 'כשבועיים'
  if (days % 7 === 0) return `כ-${days / 7} שבועות`
  return `כ-${days} ימים`
}

function scopeLines(input: PriceQuoteMessageInput): string[] {
  if (input.estimatedSessions === null) {
    return ['🧩 ייתכן שהעבודה תתפרס על יותר ממפגש אחד. האמן יעדכן אחרי המפגש הראשון.']
  }
  if (input.estimatedSessions <= 1) return []
  return [
    `🧩 היקף העבודה: צפויה להתפרס על כ-${input.estimatedSessions} מפגשים. זה המפגש הראשון, ואת הבאים נקבע בהפרש של ${healingGapLabel(input.healingPeriodDays)} לצורך החלמה.`,
  ]
}

function healthDeclarationLines(input: PriceQuoteMessageInput, next: string): string[] {
  return ['', '📝 לפני שריון התור, יש למלא הצהרת בריאות קצרה בקישור הבא:', input.healthFormUrl, next]
}

function paymentLines(input: PriceQuoteMessageInput, closing: string): string[] {
  return [
    input.paymentInstructions ? `\n📲 פרטי תשלום למקדמה (ביט / PayBox / העברה):\n${input.paymentInstructions}` : '',
    `\n${input.cancellationPolicyText}`,
    `\nלאחר ההעברה יש לשלוח כאן צילום מסך של האסמכתה ונסגור את ${closing}!`,
  ]
}

function consultationMessage(input: PriceQuoteMessageInput, whenLine: string): string[] {
  const hasDeposit = input.depositAmount != null && input.depositAmount > 0
  const depositLine = hasDeposit ? `מקדמה לשריון: ₪${input.depositAmount} (תקוזז מעלות הקעקוע).` : 'פגישת הייעוץ ללא עלות.'
  const head = [whenLine, `⏱ משך משוער: ${input.durationLabel}.`, depositLine, LOCATION_LINE]
  if (input.needsHealthDeclaration) {
    const next = hasDeposit ? 'לאחר מילוי ההצהרה נשלח את פרטי התשלום לשריון סופי.' : 'לאחר מילוי ההצהרה התור ייקבע ביומן.'
    return ['היי! הצוות עבר על הפרטים, הנה פרטי פגישת הייעוץ: ✨', '', ...head, ...healthDeclarationLines(input, next)]
  }
  return ['היי! הנה סיכום הפרטים של פגישת הייעוץ: ✨', '', ...head, ...(hasDeposit ? paymentLines(input, 'המועד') : [])]
}

function tattooMessage(input: PriceQuoteMessageInput, whenLine: string): string[] {
  const range = input.priceMin === input.priceMax ? `₪${input.priceMin.toLocaleString()}` : `₪${input.priceMin.toLocaleString()}–${input.priceMax.toLocaleString()}`
  const perSession = input.estimatedSessions !== null && input.estimatedSessions > 1
  const head = [
    whenLine,
    `⏱ משך משוער: ${input.durationLabel}.`,
    `💰 מחיר משוער${perSession ? ' לכל מפגש' : ''}: ${range}.`,
    ...scopeLines(input),
    perSession
      ? `💳 מקדמה לשריון המפגש הראשון: ₪${input.depositAmount ?? 0}. ${perSessionDepositNote(input.depositPerSession)}`
      : `💳 מקדמה לשריון: ₪${input.depositAmount ?? 0}.`,
    LOCATION_LINE,
  ]
  if (input.needsHealthDeclaration) {
    return ['היי! הצוות עבר על הפרטים, הנה פרטי התור לקעקוע: ✨', '', ...head, ...healthDeclarationLines(input, 'לאחר מילוי ההצהרה נשלח את פרטי התשלום לשריון סופי.')]
  }
  return ['היי! הנה סיכום הפרטים של פרטי התור לקעקוע: ✨', '', ...head, ...paymentLines(input, 'התור')]
}

export function buildPriceQuoteMessage(input: PriceQuoteMessageInput): string {
  const whenLine = `🗓 מועד: ${input.when}${input.staffName ? ` אצל ${input.staffName}` : ''}.`
  return (input.isSketch ? consultationMessage(input, whenLine) : tattooMessage(input, whenLine)).filter(Boolean).join('\n')
}
