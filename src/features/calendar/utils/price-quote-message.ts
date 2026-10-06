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

export const STUDIO_LOCATION_LINE = '📍 איפה: שוהם מרקט קומה מינוס אחת, יש חנייה בשפע במתחם INKMIND!'

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

function healthDeclarationMessage(input: PriceQuoteMessageInput, next: string): string {
  return [
    '📝 לפני שריון התור, יש למלא הצהרת בריאות קצרה בקישור הבא:',
    input.healthFormUrl,
    '',
    next,
  ].filter(Boolean).join('\n')
}

function paymentMessage(input: PriceQuoteMessageInput, closing: string): string {
  return [
    `נשאר לנו רק שריון סופי של ${closing} באמצעות מקדמה על סך ₪${input.depositAmount ?? 0}:`,
    input.paymentInstructions ? `\n📲 לתשלום למקדמה (ביט / PayBox / העברה):\n${input.paymentInstructions}` : '',
    input.cancellationPolicyText ? `\n${input.cancellationPolicyText}` : '',
    `\nלאחר ההעברה יש לשלוח כאן צילום מסך של האסמכתה ונסגור את ${closing}! 🙌`,
  ].filter(Boolean).join('\n')
}

function consultationMessages(input: PriceQuoteMessageInput, whenLine: string): string[] {
  const hasDeposit = input.depositAmount != null && input.depositAmount > 0
  const depositLine = hasDeposit ? `💳 מקדמה לשריון: ₪${input.depositAmount} (תקוזז מעלות הקעקוע).` : 'פגישת הייעוץ ללא עלות.'
  
  if (input.needsHealthDeclaration) {
    const slotSummary = [
      'היי! הצוות עבר על הפרטים, הנה פרטי פגישת הייעוץ: ✨',
      '',
      whenLine,
      '⏱ משך משוער: עד שעה.',
      depositLine,
    ].join('\n')

    const next = hasDeposit
      ? 'לאחר מילוי ההצהרה נשלח את פרטי התשלום לשריון סופי.'
      : 'לאחר מילוי ההצהרה התור ייקבע ביומן.'
    const healthMsg = healthDeclarationMessage(input, next)
    return [slotSummary, healthMsg]
  }

  if (hasDeposit) {
    const slotSummary = [
      'היי! הנה סיכום הפרטים של פגישת הייעוץ: ✨',
      '',
      whenLine,
      '⏱ משך משוער: עד שעה.',
      depositLine,
    ].join('\n')
    const payMsg = paymentMessage(input, 'המועד')
    return [slotSummary, payMsg]
  }

  const confirmedMessage = [
    'היי! הצוות אישר את פגישת הייעוץ והתור נקבע ביומן! ✨',
    '',
    whenLine,
    '⏱ משך משוער: עד שעה.',
    depositLine,
    STUDIO_LOCATION_LINE,
    '',
    'נשלח לך תזכורת מסודרת לפני המפגש. מחכים לראותך! 🙌',
  ].join('\n')
  return [confirmedMessage]
}

function tattooMessages(input: PriceQuoteMessageInput, whenLine: string): string[] {
  const range = input.priceMin === input.priceMax ? `₪${input.priceMin.toLocaleString()}` : `₪${input.priceMin.toLocaleString()}–${input.priceMax.toLocaleString()}`
  const perSession = input.estimatedSessions !== null && input.estimatedSessions > 1
  const hasDeposit = input.depositAmount != null && input.depositAmount > 0
  const depositLine = hasDeposit
    ? (perSession
      ? `💳 מקדמה לשריון המפגש הראשון: ₪${input.depositAmount}. ${perSessionDepositNote(input.depositPerSession)}`
      : `💳 מקדמה לשריון: ₪${input.depositAmount}.`)
    : ''

  if (input.needsHealthDeclaration) {
    const slotSummary = [
      'היי! הצוות עבר על הפרטים, הנה פרטי התור לקעקוע: ✨',
      '',
      whenLine,
      `⏱ משך משוער: ${input.durationLabel}.`,
      `💰 מחיר משוער${perSession ? ' לכל מפגש' : ''}: ${range}.`,
      ...scopeLines(input),
      depositLine,
    ].filter(Boolean).join('\n')

    const next = hasDeposit
      ? 'לאחר מילוי ההצהרה נשלח את פרטי התשלום לשריון סופי.'
      : 'לאחר מילוי ההצהרה התור ייקבע ביומן.'
    const healthMsg = healthDeclarationMessage(input, next)
    return [slotSummary, healthMsg]
  }

  const slotSummary = [
    'היי! הנה סיכום הפרטים של פרטי התור לקעקוע: ✨',
    '',
    whenLine,
    `⏱ משך משוער: ${input.durationLabel}.`,
    `💰 מחיר משוער${perSession ? ' לכל מפגש' : ''}: ${range}.`,
    ...scopeLines(input),
    depositLine,
  ].filter(Boolean).join('\n')

  if (hasDeposit) {
    const payMsg = paymentMessage(input, 'התור')
    return [slotSummary, payMsg]
  }

  return [slotSummary]
}

export function buildPriceQuoteMessages(input: PriceQuoteMessageInput): string[] {
  const whenLine = `🗓 מועד: ${input.when}${input.staffName ? ` אצל ${input.staffName}` : ''}.`
  return input.isSketch ? consultationMessages(input, whenLine) : tattooMessages(input, whenLine)
}

export function buildPriceQuoteMessage(input: PriceQuoteMessageInput): string {
  return buildPriceQuoteMessages(input).join('\n\n')
}
