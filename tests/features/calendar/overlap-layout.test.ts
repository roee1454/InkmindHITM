import { describe, expect, it } from 'vitest'
import { layoutOverlaps } from '#/features/calendar/utils/overlap-layout'
import type { TimedItem } from '#/features/calendar/utils/overlap-layout'

/** Minutes from midnight, so the fixtures read like a working day. */
const at = (start: string, end: string): TimedItem => {
  const toMinutes = (t: string) => {
    const [h = 0, m = 0] = t.split(':').map(Number)
    return h * 60 + m
  }
  return { startMinutes: toMinutes(start), endMinutes: toMinutes(end) }
}

describe('overlap layout', () => {
  it('gives an appointment with nothing beside it the whole column', () => {
    const alone = at('10:00', '11:00')
    const later = at('12:00', '13:00')
    const layout = layoutOverlaps([alone, later])

    expect(layout.get(alone)).toEqual({ column: 0, columnCount: 1, span: 1 })
    expect(layout.get(later)).toEqual({ column: 0, columnCount: 1, span: 1 })
  })

  it('splits two genuinely concurrent appointments down the middle', () => {
    const first = at('10:00', '12:00')
    const second = at('11:00', '13:00')
    const layout = layoutOverlaps([first, second])

    expect(layout.get(first)).toEqual({ column: 0, columnCount: 2, span: 1 })
    expect(layout.get(second)).toEqual({ column: 1, columnCount: 2, span: 1 })
  })

  it('treats an appointment ending exactly when the next starts as not overlapping', () => {
    const morning = at('10:00', '11:00')
    const noon = at('11:00', '12:00')
    const layout = layoutOverlaps([morning, noon])

    expect(layout.get(morning)?.columnCount).toBe(1)
    expect(layout.get(noon)?.columnCount).toBe(1)
  })

  it('expands across columns whose appointments already ended, instead of staying chain-narrow', () => {
    // A long morning session keeps the group open; two short ones widen it to three columns and
    // then finish. The 11:00 appointment has both of those columns free for its whole run.
    const longMorning = at('10:00', '12:00')
    const shortA = at('10:00', '10:30')
    const shortB = at('10:00', '10:30')
    const afterTheRush = at('11:00', '11:30')
    const layout = layoutOverlaps([longMorning, shortA, shortB, afterTheRush])

    expect(layout.get(longMorning)).toMatchObject({ column: 0, columnCount: 3, span: 1 })
    // Without expansion this was column 1 of 3 — a third of the width, beside nothing at all.
    expect(layout.get(afterTheRush)).toMatchObject({ column: 1, columnCount: 3, span: 2 })
  })

  it('never expands over an appointment that really is beside it', () => {
    const long = at('10:00', '14:00')
    const beside = at('11:00', '13:00')
    const third = at('11:30', '12:00')
    const layout = layoutOverlaps([long, beside, third])

    // Every one of the three is live at 11:30, so nobody gets to widen.
    expect(layout.get(long)?.span).toBe(1)
    expect(layout.get(beside)?.span).toBe(1)
    expect(layout.get(third)?.span).toBe(1)
  })

  it('keeps every item inside its column count', () => {
    const items = [at('10:00', '13:00'), at('10:00', '10:30'), at('10:00', '10:30'), at('11:00', '11:30'), at('12:00', '12:30')]
    for (const [item, { column, columnCount, span }] of layoutOverlaps(items)) {
      expect(column + span).toBeLessThanOrEqual(columnCount)
      expect(span).toBeGreaterThanOrEqual(1)
      expect(item.startMinutes).toBeLessThan(item.endMinutes)
    }
  })
})
