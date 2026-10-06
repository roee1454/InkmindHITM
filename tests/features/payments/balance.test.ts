import { describe, expect, it } from 'vitest'
import { balanceAfterClosing, computeProjectBalance, needsCloseOut } from '@/features/payments/utils/balance'
import type { LedgerAppointment, LedgerPayment } from '@/features/payments/types'

const appt = (id: string, overrides: Partial<LedgerAppointment> = {}): LedgerAppointment => ({
  id,
  kind: 'session',
  status: 'completed',
  startTime: '2026-09-01T10:00:00.000Z',
  finalPrice: null,
  chargeWaived: false,
  ...overrides,
})
const pay = (amount: number, overrides: Partial<LedgerPayment> = {}): LedgerPayment => ({
  id: `p${amount}`,
  appointmentId: null,
  kind: 'payment',
  method: 'cash',
  amount,
  status: 'verified',
  receivedAt: null,
  ...overrides,
})

describe('computeProjectBalance', () => {
  it('bills completed sessions and counts only verified money', () => {
    const balance = computeProjectBalance(
      [appt('a', { finalPrice: 2000 }), appt('b', { status: 'confirmed', finalPrice: null }), appt('c', { finalPrice: 900, chargeWaived: true })],
      [pay(500, { kind: 'deposit' }), pay(1000), pay(300, { status: 'pending_verification' }), pay(200, { status: 'voided' })],
    )
    expect(balance).toEqual({ billed: 2000, paid: 1500, refunded: 0, due: 500, credit: 0 })
  })

  it('shows a deposit for a future session as credit, and nets refunds', () => {
    expect(computeProjectBalance([appt('a', { status: 'confirmed' })], [pay(500, { kind: 'deposit' })])).toMatchObject({ due: 0, credit: 500 })
    expect(computeProjectBalance([], [pay(500, { kind: 'deposit' }), pay(500, { kind: 'refund' })])).toMatchObject({ paid: 500, refunded: 500, credit: 0, due: 0 })
  })
})

describe('balanceAfterClosing', () => {
  it('previews the balance with this session closed and the new payments added', () => {
    const appointments = [appt('done', { finalPrice: 2000 }), appt('now', { status: 'confirmed' })]
    const payments = [pay(500, { kind: 'deposit' }), pay(2000)]
    expect(
      balanceAfterClosing(appointments, payments, { appointmentId: 'now', finalPrice: 1800, chargeWaived: false, newPayments: [{ method: 'bit', amount: 1300 }] }),
    ).toEqual({ billed: 3800, paid: 3800, refunded: 0, due: 0, credit: 0 })
    expect(
      balanceAfterClosing(appointments, payments, { appointmentId: 'now', finalPrice: null, chargeWaived: true, newPayments: [] }),
    ).toMatchObject({ billed: 2000, credit: 500 })
  })
})

describe('needsCloseOut', () => {
  const now = Date.parse('2026-09-24T12:00:00.000Z')
  it('flags started, unclosed sessions and touch-ups only', () => {
    expect(needsCloseOut({ kind: 'session', status: 'confirmed', startTime: '2026-09-24T09:00:00.000Z' }, now)).toBe(true)
    expect(needsCloseOut({ kind: 'touch_up', status: 'confirmed', startTime: '2026-09-24T09:00:00.000Z' }, now)).toBe(true)
    expect(needsCloseOut({ kind: 'session', status: 'confirmed', startTime: '2026-09-25T09:00:00.000Z' }, now)).toBe(false)
    expect(needsCloseOut({ kind: 'session', status: 'completed', startTime: '2026-09-24T09:00:00.000Z' }, now)).toBe(false)
    expect(needsCloseOut({ kind: 'consultation', status: 'confirmed', startTime: '2026-09-24T09:00:00.000Z' }, now)).toBe(false)
  })
})
