import type { PaymentKind, PaymentMethod, PaymentStatus } from '../types'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'מזומן',
  credit_card: 'אשראי',
  bit: 'ביט',
  paybox: 'PayBox',
  bank_transfer: 'העברה בנקאית',
  other: 'אחר',
}

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  deposit: 'מקדמה',
  payment: 'תשלום',
  refund: 'החזר',
}

export function formatIls(amount: number): string {
  return `₪${amount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}`
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: 'ממתין לאישור',
  verified: 'אושר',
  rejected: 'נדחה',
  voided: 'בוטל',
}

/** A payment's day as "10.9.26"; empty when the date is unreadable. */
export function formatPaymentDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })
}
