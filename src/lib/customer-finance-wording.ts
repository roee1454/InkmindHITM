import type { DepositApplication, DepositPerSession } from './project-policy'

/**
 * How the bot talks about a customer's money, worded once. Every number comes from the project's
 * ledger (payments/utils/balance.ts); the bot never computes a balance or names a final price
 * itself. Whether a deposit is refunded is staff's call: that rule lives with the cancellation
 * policy (cancellation-policy.ts, BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION).
 *
 * Which session a deposit is set against is the studio's setting (docs/projects-payments/decisions.md:
 * every session takes its own deposit, set against that session).
 */
function ils(amount: number): string {
  return `₪${amount.toLocaleString()}`
}

export function depositCreditLine(amount: number, application: DepositApplication): string {
  return application === 'last_session'
    ? `המקדמה ששולמה (${ils(amount)}) רשומה ותקוזז מהתשלום על המפגש האחרון.`
    : `המקדמה ששולמה (${ils(amount)}) רשומה ותקוזז מהתשלום על המפגש שלה.`
}

/** In the quote of multi-session work: how deposits work across the sessions. */
export function perSessionDepositNote(depositPerSession: DepositPerSession): string {
  return depositPerSession === 'required'
    ? 'לכל מפגש נגבית מקדמה משלו, שמקוזזת מהתשלום על אותו מפגש.'
    : 'המקדמה נגבית פעם אחת, לשריון המפגש הראשון.'
}

/** The project's money state for the customer, or null when there's nothing to say yet. */
export function balanceLine(balance: { due: number; credit: number }): string | null {
  if (balance.due > 0) return `יתרה לתשלום על סשנים שהסתיימו: ${ils(balance.due)}.`
  if (balance.credit > 0) return `לזכות הלקוח: ${ils(balance.credit)}, שיקוזזו מהתשלום הבא.`
  return null
}

export const NO_FINAL_PRICE_RULE =
  'המחיר הסופי של כל סשן נקבע על ידי האמן בסוף הסשן. אין לך מידע על מחיר סופי: אל תנקוב בסכום ואל תחשב אותו. אם הלקוח שואל, מסור את טווח המחיר המשוער ואמור שהאמן יעדכן בסוף הסשן.'

export const LEDGER_NUMBERS_ONLY_RULE =
  'השתמש רק בסכומים שמופיעים כאן. אל תחשב יתרות, הנחות או החזרים בעצמך. שאלה על כסף שאין לה תשובה כאן: קרא ל-call_staff.'
