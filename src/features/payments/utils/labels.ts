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
