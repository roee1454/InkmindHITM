import type { DepositApplication } from '@/lib/project-policy'
import type { LedgerAppointment, ProjectBalance } from '../types'

/**
 * What closing a session should suggest collecting now. The ledger itself doesn't care which
 * session a deposit "belongs" to — this only decides the suggestion:
 * - first_session: credit (usually the deposit) is used up as soon as there's something to pay;
 * - last_session: sessions before the last are charged in full and the credit waits for the last.
 * Anything already owed from earlier sessions is always included.
 */
export function suggestedCollection(input: {
  balanceBefore: ProjectBalance
  price: number | null
  chargeWaived: boolean
  depositApplication: DepositApplication
  isLastSession: boolean
}): number {
  const price = input.chargeWaived ? 0 : (input.price ?? 0)
  const owed = input.balanceBefore.due + price
  const useCredit = input.depositApplication === 'first_session' || input.isLastSession
  return useCredit ? Math.max(owed - input.balanceBefore.credit, 0) : owed
}

const BILLABLE = ['session', 'touch_up']

/**
 * Whether closing this session most likely finishes the piece: no other session is still booked,
 * and the estimate (when there is one) has been reached. Staff can always change it.
 */
export function defaultIsLastSession(
  appointments: LedgerAppointment[],
  closingId: string,
  estimatedSessions: number | null,
): boolean {
  const others = appointments.filter((a) => a.id !== closingId && BILLABLE.includes(a.kind))
  if (others.some((a) => a.status === 'pending' || a.status === 'confirmed')) return false
  if (estimatedSessions === null) return true
  const doneAfterThis = others.filter((a) => a.kind === 'session' && a.status === 'completed').length + 1
  return doneAfterThis >= estimatedSessions
}
