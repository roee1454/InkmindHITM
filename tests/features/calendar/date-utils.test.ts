import { describe, expect, it } from 'vitest'
import { weekDays } from '#/features/calendar/utils/date-utils'
import { toYmd } from '@/lib/date-utils'

describe('weekDays', () => {
  it('returns a full week of 7 consecutive days, snapped to the week start', () => {
    const days = weekDays(new Date(2026, 7, 12)) // Wed 12 Aug 2026
    expect(days).toHaveLength(7)
    for (let i = 1; i < days.length; i++) {
      const gapMs = days[i]!.getTime() - days[i - 1]!.getTime()
      expect(Math.round(gapMs / 86_400_000)).toBe(1)
    }
  })

  it('lands on the same week regardless of which day of it is passed in', () => {
    // Sunday 9 Aug 2026 through Saturday 15 Aug 2026 — the week containing Wed 12 Aug.
    const week = [9, 10, 11, 12, 13, 14, 15].map((d) => toYmd(weekDays(new Date(2026, 7, d))[0]!))
    expect(new Set(week).size).toBe(1)
  })
})
