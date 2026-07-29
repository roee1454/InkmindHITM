import { describe, expect, it } from 'vitest'
import { resolveHebrewDateExpression } from './datetime.server'

// Fixed anchor: Wednesday 2026-07-22 (2026-07-26 is a Sunday — the same anchor the
// prompt few-shots use). Every expectation below is hand-computed from this date.
const NOW = new Date(2026, 6, 22, 15, 30)

const resolve = (expr: string) => resolveHebrewDateExpression(expr, NOW)

describe('resolveHebrewDateExpression', () => {
  it('fixed relative words', () => {
    expect(resolve('היום')).toMatchObject({ status: 'resolved', date: '2026-07-22', dayName: 'רביעי' })
    expect(resolve('מחר')).toMatchObject({ status: 'resolved', date: '2026-07-23', dayName: 'חמישי' })
    expect(resolve('מחרתיים')).toMatchObject({ status: 'resolved', date: '2026-07-24', dayName: 'שישי' })
  })

  it('offsets: עוד X', () => {
    expect(resolve('עוד שבוע')).toMatchObject({ status: 'resolved', date: '2026-07-29' })
    expect(resolve('בעוד שבועיים')).toMatchObject({ status: 'resolved', date: '2026-08-05' })
    expect(resolve('עוד 3 ימים')).toMatchObject({ status: 'resolved', date: '2026-07-25' })
  })

  it('bare weekday = nearest upcoming, never today', () => {
    expect(resolve('ראשון')).toMatchObject({ status: 'resolved', date: '2026-07-26', dayName: 'ראשון' })
    expect(resolve('ביום שישי')).toMatchObject({ status: 'resolved', date: '2026-07-24' })
    // Today is Wednesday — "רביעי" must mean NEXT Wednesday, with a confirm note.
    const sameDay = resolve('רביעי')
    expect(sameDay).toMatchObject({ status: 'resolved', date: '2026-07-29' })
    expect((sameDay as { note?: string }).note).toBeTruthy()
  })

  it('"X הבא" = next calendar week; notes the alternative when it differs', () => {
    // Next-week Sunday IS the nearest Sunday from Wednesday — no note needed.
    const sunday = resolve('ראשון הבא')
    expect(sunday).toMatchObject({ status: 'resolved', date: '2026-07-26' })
    expect((sunday as { note?: string }).note).toBeUndefined()
    // Nearest Thursday is tomorrow (23.7), but "חמישי הבא" = next week's (30.7) — note required.
    const thursday = resolve('חמישי הבא')
    expect(thursday).toMatchObject({ status: 'resolved', date: '2026-07-30' })
    expect((thursday as { note?: string }).note).toContain('23.7')
  })

  it('weekend and week ranges are ambiguous, not guesses', () => {
    const weekend = resolve('סופ"ש')
    expect(weekend.status).toBe('ambiguous')
    expect((weekend as { candidates?: unknown[] }).candidates).toHaveLength(2)
    expect(resolve('שבוע הבא').status).toBe('ambiguous')
    expect(resolve('השבוע').status).toBe('ambiguous')
  })

  it('vague expressions are unrecognized, prompting a clarifying question', () => {
    expect(resolve('בקרוב').status).toBe('unrecognized')
    expect(resolve('מתישהו').status).toBe('unrecognized')
  })

  it('numeric dates, including the passed-date → next-year note', () => {
    expect(resolve('26.7')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
    expect(resolve('26/7/2026')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
    expect(resolve('2026-08-01')).toMatchObject({ status: 'resolved', date: '2026-08-01' })
    const passed = resolve('15.3')
    expect(passed).toMatchObject({ status: 'resolved', date: '2027-03-15' })
    expect((passed as { note?: string }).note).toBeTruthy()
    expect(resolve('40.13').status).toBe('unrecognized')
  })

  it('spoken form matches the LANG-4 convention', () => {
    expect(resolve('ראשון')).toMatchObject({ spoken: 'ראשון, 26.7' })
  })
})
