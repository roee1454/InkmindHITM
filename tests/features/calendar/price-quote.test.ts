import { describe, expect, it } from 'vitest'
import { quoteTargetState } from '@/features/calendar/utils/price-quote'

describe('quoteTargetState', () => {
  it('books a free consultation outright when the health declaration is valid', () => {
    expect(quoteTargetState({ isSketch: true, hasDeposit: false, isHealthValid: true }).state).toBe('AWAITING_APPOINTMENT')
    expect(quoteTargetState({ isSketch: true, hasDeposit: false, isHealthValid: false }).state).toBe('AWAIT_HEALTH_NOTICE')
  })

  it('asks for the declaration before payment, and goes straight to payment when it is valid', () => {
    expect(quoteTargetState({ isSketch: false, hasDeposit: true, isHealthValid: false }).state).toBe('AWAIT_HEALTH_NOTICE')
    expect(quoteTargetState({ isSketch: false, hasDeposit: true, isHealthValid: true }).state).toBe('AWAIT_PAYMENT')
    expect(quoteTargetState({ isSketch: true, hasDeposit: true, isHealthValid: true }).state).toBe('AWAIT_PAYMENT')
  })
})
