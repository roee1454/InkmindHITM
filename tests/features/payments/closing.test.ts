import { describe, expect, it } from 'vitest'
import { defaultIsLastSession, suggestedCollection } from '@/features/payments/utils/closing'
import type { LedgerAppointment, ProjectBalance } from '@/features/payments/types'

const balance = (overrides: Partial<ProjectBalance> = {}): ProjectBalance => ({ billed: 0, paid: 0, refunded: 0, due: 0, credit: 0, ...overrides })

describe('suggestedCollection', () => {
  const withDeposit = balance({ paid: 500, credit: 500 })

  it('uses the deposit on the first session by default', () => {
    expect(suggestedCollection({ balanceBefore: withDeposit, price: 2000, chargeWaived: false, depositApplication: 'first_session', isLastSession: false })).toBe(1500)
  })

  it('keeps the deposit for the last session when the studio applies it there', () => {
    expect(suggestedCollection({ balanceBefore: withDeposit, price: 2000, chargeWaived: false, depositApplication: 'last_session', isLastSession: false })).toBe(2000)
    expect(suggestedCollection({ balanceBefore: withDeposit, price: 1800, chargeWaived: false, depositApplication: 'last_session', isLastSession: true })).toBe(1300)
  })

  it('adds what is still owed from earlier sessions', () => {
    expect(suggestedCollection({ balanceBefore: balance({ due: 300 }), price: 1000, chargeWaived: false, depositApplication: 'first_session', isLastSession: false })).toBe(1300)
  })

  it('never suggests a negative amount', () => {
    expect(suggestedCollection({ balanceBefore: balance({ credit: 800 }), price: 500, chargeWaived: false, depositApplication: 'first_session', isLastSession: false })).toBe(0)
  })

  it('suggests only earlier debt for a session without a charge', () => {
    expect(suggestedCollection({ balanceBefore: balance({ due: 200 }), price: 900, chargeWaived: true, depositApplication: 'first_session', isLastSession: true })).toBe(200)
    expect(suggestedCollection({ balanceBefore: balance(), price: null, chargeWaived: false, depositApplication: 'first_session', isLastSession: false })).toBe(0)
  })
})

const appt = (id: string, kind: LedgerAppointment['kind'], status: LedgerAppointment['status']): LedgerAppointment => ({
  id,
  kind,
  status,
  startTime: '2026-10-01T10:00:00.000Z',
  finalPrice: null,
  chargeWaived: false,
})

describe('defaultIsLastSession', () => {
  it('leaves it to staff when nothing else is booked and nobody estimated the sessions', () => {
    expect(defaultIsLastSession([appt('c', 'consultation', 'completed'), appt('s1', 'session', 'confirmed')], 's1', null)).toBeNull()
  })

  it('is not the last session while another session is booked', () => {
    expect(defaultIsLastSession([appt('s1', 'session', 'confirmed'), appt('s2', 'session', 'pending')], 's1', null)).toBe(false)
  })

  it('follows the estimate', () => {
    const sessions = [appt('s1', 'session', 'completed'), appt('s2', 'session', 'confirmed')]
    expect(defaultIsLastSession(sessions, 's2', 3)).toBe(false)
    expect(defaultIsLastSession(sessions, 's2', 2)).toBe(true)
  })

  it('ignores cancelled sessions and consultations', () => {
    expect(defaultIsLastSession([appt('c', 'consultation', 'pending'), appt('x', 'session', 'cancelled'), appt('s1', 'session', 'confirmed')], 's1', 1)).toBe(true)
  })
})
