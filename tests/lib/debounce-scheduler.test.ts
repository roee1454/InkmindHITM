import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { botTurnScheduler } from '@/lib/debounce-scheduler'
import { INBOUND_MESSAGE_DEBOUNCE_MS } from '@/features/conversations/server/webhook'

describe('DebounceScheduler (10-second wait period & burst coalescing)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    botTurnScheduler.cancel('test-conv')
    vi.useRealTimers()
  })

  it('verifies the configured debounce wait period is exactly 10 seconds (10,000ms)', () => {
    expect(INBOUND_MESSAGE_DEBOUNCE_MS).toBe(10_000)
  })

  it('waits for the full 10-second silence period before executing the turn', () => {
    const callback = vi.fn()

    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)

    // Advance 5 seconds — should NOT have fired yet
    vi.advanceTimersByTime(5_000)
    expect(callback).not.toHaveBeenCalled()

    // Advance remaining 5 seconds (total 10s) — should fire now
    vi.advanceTimersByTime(5_000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('resets the 10-second timer when new messages arrive during the wait period', () => {
    const callback = vi.fn()

    // Customer sends message 1 at t=0s
    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)

    // Customer sends message 2 at t=4s -> timer resets to 10s from now
    vi.advanceTimersByTime(4_000)
    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)
    expect(callback).not.toHaveBeenCalled()

    // Customer sends photo at t=7s (3s after msg 2) -> timer resets to 10s from now
    vi.advanceTimersByTime(3_000)
    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)
    expect(callback).not.toHaveBeenCalled()

    // Advance 9 seconds after photo (t=16s total) -> should still NOT have fired
    vi.advanceTimersByTime(9_000)
    expect(callback).not.toHaveBeenCalled()

    // Advance 1 more second (10s of silence since photo) -> fires exactly once
    vi.advanceTimersByTime(1_000)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancels the scheduled turn when cancel() is called', () => {
    const callback = vi.fn()

    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)
    vi.advanceTimersByTime(5_000)

    botTurnScheduler.cancel('test-conv')
    vi.advanceTimersByTime(10_000)

    expect(callback).not.toHaveBeenCalled()
  })

  it('immediately fires and cancels pending when cancelAndRunNow() is called', () => {
    const callback = vi.fn()

    botTurnScheduler.schedule('test-conv', INBOUND_MESSAGE_DEBOUNCE_MS, callback)
    vi.advanceTimersByTime(2_000)

    botTurnScheduler.cancelAndRunNow('test-conv', () => {})
    expect(callback).toHaveBeenCalledTimes(1)

    // Advancing timers further should not fire again
    vi.advanceTimersByTime(10_000)
    expect(callback).toHaveBeenCalledTimes(1)
  })
})

