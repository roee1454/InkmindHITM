import { describe, expect, it } from 'vitest'
import { stateAfterCancellation } from '@/features/conversations/utils/after-cancellation'
import { canTransition } from '@/features/conversations/server/state-machine'

describe('stateAfterCancellation', () => {
  it('sends a flow whose own hold was cancelled back to collecting details', () => {
    for (const state of ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION'] as const) {
      expect(stateAfterCancellation({ state, cancelled: 'pending', otherUpcoming: 0 })).toBe('COLLECTING_INFO')
    }
  })

  it('leaves a booking flow alone when a different, confirmed appointment is cancelled', () => {
    expect(stateAfterCancellation({ state: 'AWAIT_PAYMENT', cancelled: 'confirmed', otherUpcoming: 1 })).toBeNull()
    expect(stateAfterCancellation({ state: 'AWAIT_PRICE_OFFER', cancelled: 'confirmed', otherUpcoming: 0 })).toBeNull()
  })

  it('closes a conversation waiting for the cancelled appointment only when nothing else is upcoming', () => {
    expect(stateAfterCancellation({ state: 'AWAITING_APPOINTMENT', cancelled: 'confirmed', otherUpcoming: 0 })).toBe('COMPLETED')
    expect(stateAfterCancellation({ state: 'AWAITING_APPOINTMENT', cancelled: 'confirmed', otherUpcoming: 1 })).toBeNull()
    expect(stateAfterCancellation({ state: 'AWAITING_APPOINTMENT', cancelled: 'pending', otherUpcoming: 0 })).toBe('COMPLETED')
  })

  it('leaves every other state alone', () => {
    for (const state of ['NEW', 'WANTS_TO_BOOK', 'COLLECTING_INFO', 'WAITLIST', 'AWAIT_NPS_SCORE', 'COMPLETED'] as const) {
      expect(stateAfterCancellation({ state, cancelled: 'pending', otherUpcoming: 0 })).toBeNull()
    }
  })

  it('only ever proposes moves the state machine accepts from the bot', () => {
    for (const state of ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION', 'AWAITING_APPOINTMENT'] as const) {
      for (const cancelled of ['pending', 'confirmed'] as const) {
        const to = stateAfterCancellation({ state, cancelled, otherUpcoming: 0 })
        if (to) expect(canTransition(state, to, 'bot')).toBe(true)
      }
    }
  })
})

describe('canTransition', () => {
  it('follows the table, allows staying put, and lets staff override into the booking steps', () => {
    expect(canTransition('WAITLIST', 'AWAIT_PRICE_OFFER', 'bot')).toBe(true)
    expect(canTransition('AWAIT_PAYMENT', 'AWAIT_PAYMENT', 'bot')).toBe(true)
    expect(canTransition('NEW', 'AWAIT_HEALTH_NOTICE', 'bot')).toBe(false)
    expect(canTransition('NEW', 'AWAIT_HEALTH_NOTICE', 'staff')).toBe(true)
    expect(canTransition('AWAIT_PAYMENT', 'COMPLETED', 'staff')).toBe(false)
  })
})
