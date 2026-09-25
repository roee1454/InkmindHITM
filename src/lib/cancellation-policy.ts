/**
 * The studio's cancellation and deposit policy, worded once. Customer-facing booking messages, the
 * bot's instructions and the settings screen all read from here, so changing the policy after the
 * studio's legal review is a one-file edit.
 *
 * The bot itself never tells a customer that their deposit is forfeited. Israeli consumer
 * protection law may entitle a customer who booked remotely (WhatsApp) to cancel with a refund
 * minus a capped fee, so whether a deposit is returned is decided by staff; the bot only says that
 * a staff member will follow up.
 */
export const DEPOSIT_NOTICE_HOURS = 168

export function isShortNoticeForDeposit(hoursUntilAppointment: number): boolean {
  return hoursUntilAppointment < DEPOSIT_NOTICE_HOURS
}

function selfCancellationLine(cutoffHours: number): string {
  return cutoffHours === 0 ? 'ביטול עצמאי אפשרי בכל עת.' : `ביטול עצמאי אפשרי עד ${cutoffHours} שעות לפני המועד.`
}

/** The policy block included in quote, payment and confirmation messages to customers. */
export function customerCancellationPolicyText(cutoffHours: number): string {
  return ['מדיניות ביטולים:', `• ${selfCancellationLine(cutoffHours)}`, '• ביטול פחות משבוע מראש — המקדמה אינה מוחזרת.'].join('\n')
}

/** Appended to the bot's tool result whenever a cancelled appointment had a paid deposit. */
export const BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION =
  ' לגבי המקדמה: אל תקבע/י בעצמך אם היא מוחזרת או מחולטת. אמור/אמרי ללקוח בנעימות שנציג הסטודיו יחזור אליו בנושא המקדמה.'

/** One line for the staff notification, so the person deciding sees where the policy stands. */
export function depositStaffSummary(depositAmount: number | null, hoursUntilAppointment: number): string {
  if (depositAmount == null) return 'לא שולמה מקדמה'
  const window = isShortNoticeForDeposit(hoursUntilAppointment)
    ? 'ביטול פחות משבוע מראש: לפי המדיניות המקדמה אינה מוחזרת (לבדיקתך)'
    : 'ביטול מעל שבוע מראש: המקדמה להסדרה מול הלקוח'
  return `שולמה מקדמה (₪${depositAmount}) — ${window}`
}
