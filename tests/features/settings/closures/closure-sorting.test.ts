import { describe, it, expect } from 'vitest'
import { sortClosureGroups } from '@/features/settings/tabs/closures/utils/closureSorting'
import type { ClosureGroup } from '@/features/settings/tabs/closures/utils/closureSorting'

describe('AI Tab — Closures & Schedule Sorting', () => {
  const today = '2026-09-21'

  it('places manual custom closures before hebcal holidays', () => {
    const groups: ClosureGroup[] = [
      {
        key: 'hebcal:rosh-hashana',
        reason: 'ראש השנה',
        ids: ['1'],
        dates: ['2026-09-22'],
        isRecurring: false,
        source: 'hebcal',
      },
      {
        key: 'manual:renovation',
        reason: 'שיפוצים בסטודיו',
        ids: ['2'],
        dates: ['2026-10-01'],
        isRecurring: false,
        source: 'manual',
      },
    ]

    const sorted = sortClosureGroups(groups, today)
    expect(sorted[0]!.reason).toBe('שיפוצים בסטודיו')
    expect(sorted[1]!.reason).toBe('ראש השנה')
  })

  it('sorts chronologically within the same source category', () => {
    const groups: ClosureGroup[] = [
      {
        key: 'manual:vacation-nov',
        reason: 'חופשה בנובמבר',
        ids: ['1'],
        dates: ['2026-11-15'],
        isRecurring: false,
        source: 'manual',
      },
      {
        key: 'manual:vacation-oct',
        reason: 'חופשה באוקטובר',
        ids: ['2'],
        dates: ['2026-10-05'],
        isRecurring: false,
        source: 'manual',
      },
      {
        key: 'hebcal:hanukkah',
        reason: 'חנוכה',
        ids: ['3'],
        dates: ['2026-12-05'],
        isRecurring: false,
        source: 'hebcal',
      },
      {
        key: 'hebcal:yom-kippur',
        reason: 'יום כיפור',
        ids: ['4'],
        dates: ['2026-09-30'],
        isRecurring: false,
        source: 'hebcal',
      },
    ]

    const sorted = sortClosureGroups(groups, today)
    expect(sorted.map((g: ClosureGroup) => g.reason)).toEqual([
      'חופשה באוקטובר',
      'חופשה בנובמבר',
      'יום כיפור',
      'חנוכה',
    ])
  })

  it('prioritizes upcoming dates over dates already passed', () => {
    const groups: ClosureGroup[] = [
      {
        key: 'manual:past',
        reason: 'סגירה בעבר',
        ids: ['1'],
        dates: ['2026-08-01'],
        isRecurring: false,
        source: 'manual',
      },
      {
        key: 'manual:future',
        reason: 'סגירה עתידית',
        ids: ['2'],
        dates: ['2026-10-01'],
        isRecurring: false,
        source: 'manual',
      },
    ]

    const sorted = sortClosureGroups(groups, today)
    expect(sorted[0]!.reason).toBe('סגירה עתידית')
    expect(sorted[1]!.reason).toBe('סגירה בעבר')
  })

  it('handles empty groups array gracefully', () => {
    expect(sortClosureGroups([], today)).toEqual([])
  })
})

