import type { AppointmentKind, AppointmentStatus } from '@/features/calendar/types'

export type PaymentKind = 'deposit' | 'payment' | 'refund'
export type PaymentMethod = 'bit' | 'paybox' | 'cash' | 'credit_card' | 'bank_transfer' | 'other'
export type PaymentStatus = 'pending_verification' | 'verified' | 'rejected' | 'voided'

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'credit_card', 'bit', 'paybox', 'bank_transfer', 'other']

export interface LedgerPayment {
  id: string
  appointmentId: string | null
  kind: PaymentKind
  method: PaymentMethod
  amount: number
  status: PaymentStatus
  receivedAt: string | null
}

export interface LedgerAppointment {
  id: string
  kind: AppointmentKind
  status: AppointmentStatus
  startTime: string
  finalPrice: number | null
  chargeWaived: boolean
}

export interface ProjectBalance {
  /** Final prices of the project's completed, charged sessions. */
  billed: number
  /** Verified deposits and payments. */
  paid: number
  refunded: number
  /** Still owed by the customer (never negative). */
  due: number
  /** Paid beyond what has been billed so far — typically a deposit for a session still ahead. */
  credit: number
}

export interface ProjectFinance {
  projectId: string
  title: string
  appointments: LedgerAppointment[]
  payments: LedgerPayment[]
  balance: ProjectBalance
}

export interface NewPayment {
  method: PaymentMethod
  amount: number
}

export interface CloseSessionInput {
  appointmentId: string
  /** Null only together with chargeWaived. */
  finalPrice: number | null
  chargeWaived: boolean
  payments: NewPayment[]
  note?: string
}
