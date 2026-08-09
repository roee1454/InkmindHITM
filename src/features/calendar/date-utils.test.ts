import { describe, expect, it } from 'vitest'
import { visibleDays, weekDays } from './date-utils'
import { toYmd } from '@/lib/date-utils'

describe('visibleDays', () => {
  const anchor = new Date(2026, 7, 12) // Wed 12 Aug 2026

  it('returns just the anchor in single-day (mobile) mode', () => {
    const days = visibleDays(anchor, 1)
    expect(days).toHaveLength(1)
    expect(toYmd(days[0]!)).toBe(toYmd(anchor))
  })

  it('is byte-identical to weekDays in 7-day mode — the desktop path is unchanged', () => {
    expect(visibleDays(anchor, 7).map(toYmd)).toEqual(weekDays(anchor).map(toYmd))
  })

  it('returns a full week of 7 consecutive days in 7-day mode', () => {
    const days = visibleDays(anchor, 7)
    expect(days).toHaveLength(7)
    for (let i = 1; i < days.length; i++) {
      const gapMs = days[i]!.getTime() - days[i - 1]!.getTime()
      expect(Math.round(gapMs / 86_400_000)).toBe(1)
    }
  })

  it('single-day mode tracks the anchor rather than snapping to the week start', () => {
    // The week-start snapping in weekDays must not leak into day mode, or paging day-by-day
    // through a week would keep landing back on Sunday.
    for (const d of [10, 11, 12, 13, 14]) {
      const a = new Date(2026, 7, d)
      expect(toYmd(visibleDays(a, 1)[0]!)).toBe(toYmd(a))
    }
  })
})
