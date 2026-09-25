import { describe, expect, it } from 'vitest'
import { CLOCK_JUMP_THRESHOLD_MS, clockDriftMs, isClockJump, isFromTheFuture } from '@/lib/clock-jump'

const DAY = 24 * 60 * 60 * 1000

describe('clock jump detection', () => {
  it('sees no drift when wall and monotonic clocks advance together', () => {
    const before = { wallMs: 1_000_000, monotonicMs: 500 }
    const after = { wallMs: 1_030_000, monotonicMs: 30_500 }
    expect(clockDriftMs(before, after)).toBe(0)
    expect(isClockJump(before, after)).toBe(false)
  })

  it('detects the wall clock being moved forward and back', () => {
    const before = { wallMs: 1_000_000, monotonicMs: 500 }
    expect(isClockJump(before, { wallMs: 1_000_000 + 4 * DAY, monotonicMs: 30_500 })).toBe(true)
    expect(isClockJump(before, { wallMs: 1_000_000 - 4 * DAY, monotonicMs: 30_500 })).toBe(true)
  })

  it('tolerates small corrections below the threshold', () => {
    const before = { wallMs: 0, monotonicMs: 0 }
    expect(isClockJump(before, { wallMs: CLOCK_JUMP_THRESHOLD_MS, monotonicMs: 0 })).toBe(false)
    expect(isClockJump(before, { wallMs: CLOCK_JUMP_THRESHOLD_MS + 1, monotonicMs: 0 })).toBe(true)
  })

  it('flags timestamps from the future, like data fetched while the clock ran 4 days ahead', () => {
    const now = Date.UTC(2026, 8, 24, 18, 0)
    expect(isFromTheFuture(Date.UTC(2026, 8, 28, 17, 16), now)).toBe(true)
    expect(isFromTheFuture(now + 30_000, now)).toBe(false)
    expect(isFromTheFuture(now - DAY, now)).toBe(false)
  })
})
