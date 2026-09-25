import type { ApiAppointment } from '@/features/calendar/types'
import type { LedgerAppointment, LedgerPayment, NewPayment, ProjectBalance } from '../types'

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

/**
 * What a project stands at: the final prices of its completed sessions against the money received.
 * Only verified payments count (a receipt still awaiting verification, a rejected or a voided one
 * doesn't). A deposit paid for a session that hasn't happened yet shows up as credit, not as a
 * negative amount due.
 */
export function computeProjectBalance(appointments: LedgerAppointment[], payments: LedgerPayment[]): ProjectBalance {
  const billed = sum(
    appointments.filter((a) => a.status === 'completed' && !a.chargeWaived).map((a) => a.finalPrice ?? 0),
  )
  const verified = payments.filter((p) => p.status === 'verified')
  const paid = sum(verified.filter((p) => p.kind !== 'refund').map((p) => p.amount))
  const refunded = sum(verified.filter((p) => p.kind === 'refund').map((p) => p.amount))
  const net = paid - refunded
  return { billed, paid, refunded, due: Math.max(billed - net, 0), credit: Math.max(net - billed, 0) }
}

/** The balance as it will be once this session is closed with the given price and payments. */
export function balanceAfterClosing(
  appointments: LedgerAppointment[],
  payments: LedgerPayment[],
  closing: { appointmentId: string; finalPrice: number | null; chargeWaived: boolean; newPayments: NewPayment[] },
): ProjectBalance {
  const closedAppointments = appointments.map((a) =>
    a.id === closing.appointmentId
      ? { ...a, status: 'completed' as const, finalPrice: closing.chargeWaived ? 0 : closing.finalPrice, chargeWaived: closing.chargeWaived }
      : a,
  )
  const withNewPayments: LedgerPayment[] = [
    ...payments,
    ...closing.newPayments.map((p, index) => ({
      id: `new-${index}`,
      appointmentId: closing.appointmentId,
      kind: 'payment' as const,
      method: p.method,
      amount: p.amount,
      status: 'verified' as const,
      receivedAt: null,
    })),
  ]
  return computeProjectBalance(closedAppointments, withNewPayments)
}

const BILLABLE: string[] = ['session', 'touch_up']

/**
 * A session or touch-up whose time has come and that nobody has closed yet — shown as
 * "ממתין לסגירה" until staff enter its final price.
 */
export function needsCloseOut(
  appointment: { kind: string; status: string; startTime: string },
  nowMs: number,
): boolean {
  return BILLABLE.includes(appointment.kind) && appointment.status === 'confirmed' && new Date(appointment.startTime).getTime() <= nowMs
}

/** Calendar appointments carry their start as the studio's local date + time. */
export function appointmentNeedsCloseOut(appointment: Pick<ApiAppointment, 'kind' | 'status' | 'date' | 'timeSlot'>, nowMs: number): boolean {
  return needsCloseOut({ ...appointment, startTime: `${appointment.date}T${appointment.timeSlot}:00` }, nowMs)
}
