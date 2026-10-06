import { describe, expect, it } from 'vitest'
import { resolveHebrewDateExpression } from '@/integrations/ai/tools/datetime/date-resolution-engine'

// Fixed anchor: Wednesday 2026-07-22 (2026-07-26 is Sunday).
const NOW = new Date(2026, 6, 22, 15, 30)

const resolve = (expr: string) => resolveHebrewDateExpression(expr, NOW)

describe('resolveHebrewDateExpression', () => {
  describe('Fixed relative words', () => {
    it('resolves היום, מחר, מחרתיים', () => {
      expect(resolve('היום')).toMatchObject({ status: 'resolved', date: '2026-07-22', dayName: 'רביעי' })
      expect(resolve('מחר')).toMatchObject({ status: 'resolved', date: '2026-07-23', dayName: 'חמישי' })
      expect(resolve('מחרתיים')).toMatchObject({ status: 'resolved', date: '2026-07-24', dayName: 'שישי' })
    })
  })

  describe('Offsets: עוד X', () => {
    it('resolves basic and extended offsets', () => {
      expect(resolve('עוד שבוע')).toMatchObject({ status: 'resolved', date: '2026-07-29' })
      expect(resolve('בעוד שבועיים')).toMatchObject({ status: 'resolved', date: '2026-08-05' })
      expect(resolve('עוד 3 ימים')).toMatchObject({ status: 'resolved', date: '2026-07-25' })
      expect(resolve('עוד שלושה ימים')).toMatchObject({ status: 'resolved', date: '2026-07-25' })
      expect(resolve('עוד ארבעה ימים')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
      expect(resolve('עוד שבוע וחצי')).toMatchObject({ status: 'resolved', date: '2026-08-01' })
      expect(resolve('עוד חודש וחצי')).toMatchObject({ status: 'resolved', date: '2026-09-05' })
    })

    it('returns ambiguous for ambiguous ranges like עוד יום-יומיים', () => {
      const res = resolve('עוד יום-יומיים')
      expect(res.status).toBe('ambiguous')
      expect((res as { candidates?: unknown[] }).candidates).toHaveLength(2)

      const weekRes = resolve('עוד שבוע-שבועיים')
      expect(weekRes.status).toBe('ambiguous')
      expect((weekRes as { candidates?: unknown[] }).candidates).toHaveLength(2)
    })
  })

  describe('Bare weekday names', () => {
    it('resolves nearest upcoming occurrence, never today', () => {
      expect(resolve('ראשון')).toMatchObject({ status: 'resolved', date: '2026-07-26', dayName: 'ראשון' })
      expect(resolve('ביום שישי')).toMatchObject({ status: 'resolved', date: '2026-07-24' })
      const sameDay = resolve('רביעי')
      expect(sameDay).toMatchObject({ status: 'resolved', date: '2026-07-29' })
      expect((sameDay as { note?: string }).note).toBeTruthy()
    })
  })

  describe('"X הבא" suffix vs "שבוע הבא X" prefix', () => {
    it('resolves "X הבא" to the occurrence in the next calendar week', () => {
      const sunday = resolve('ראשון הבא')
      expect(sunday).toMatchObject({ status: 'resolved', date: '2026-07-26' })
      expect((sunday as { note?: string }).note).toBeUndefined()

      const thursday = resolve('חמישי הבא')
      expect(thursday).toMatchObject({ status: 'resolved', date: '2026-07-30' })
      expect((thursday as { note?: string }).note).toContain('23.7')
    })

    it('resolves "שבוע הבא ביום X" prefixes properly', () => {
      expect(resolve('שבוע הבא ביום שלישי')).toMatchObject({ status: 'resolved', date: '2026-07-28', dayName: 'שלישי' })
      expect(resolve('שבוע הבא יום שני')).toMatchObject({ status: 'resolved', date: '2026-07-27', dayName: 'שני' })
      expect(resolve('בשבוע הבא בחמישי')).toMatchObject({ status: 'resolved', date: '2026-07-30', dayName: 'חמישי' })
      expect(resolve('שבוע הבא שלישי')).toMatchObject({ status: 'resolved', date: '2026-07-28', dayName: 'שלישי' })
    })
  })

  describe('Exact hours & timeSlot extraction', () => {
    it('extracts numeric 24h hours (14:00, 16:30, 11:30)', () => {
      expect(resolve('מחר ב-14:00')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:00',
        timeOfDay: 'noon',
      })
      expect(resolve('מחר ב14:00')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:00',
      })
      expect(resolve('מחר ב 14:00')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:00',
      })
      expect(resolve('מחר בשעה 14:00')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:00',
      })
      expect(resolve('חמישי ב-16:30')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '16:30',
        timeOfDay: 'afternoon',
      })
      expect(resolve('26.7 ב-15:00')).toMatchObject({
        status: 'resolved',
        date: '2026-07-26',
        timeSlot: '15:00',
        timeOfDay: 'afternoon',
      })
      expect(resolve('ב-26.7 בשעה 11:30')).toMatchObject({
        status: 'resolved',
        date: '2026-07-26',
        timeSlot: '11:30',
        timeOfDay: 'morning',
      })
    })

    it('extracts spoken Hebrew hours (בשתיים בצהריים, בארבע אחה״צ)', () => {
      expect(resolve('מחר בשתיים בצהריים')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:00',
        timeOfDay: 'noon',
      })
      expect(resolve('חמישי בארבע אחה״צ')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '16:00',
        timeOfDay: 'afternoon',
      })
      expect(resolve('ראשון בשמונה בערב')).toMatchObject({
        status: 'resolved',
        date: '2026-07-26',
        timeSlot: '20:00',
        timeOfDay: 'evening',
      })
      expect(resolve('מחר בעשר בבוקר')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '10:00',
        timeOfDay: 'morning',
      })
      expect(resolve('מחר בשתיים וחצי בצהריים')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeSlot: '14:30',
        timeOfDay: 'noon',
      })
    })
  })

  describe('Hebrew Month Names', () => {
    it('resolves day + Hebrew month name expressions', () => {
      expect(resolve('15 באוגוסט')).toMatchObject({ status: 'resolved', date: '2026-08-15' })
      expect(resolve('15 לאוגוסט')).toMatchObject({ status: 'resolved', date: '2026-08-15' })
      expect(resolve('ב-15 לאוגוסט')).toMatchObject({ status: 'resolved', date: '2026-08-15' })
      expect(resolve('ה-20 בספטמבר')).toMatchObject({ status: 'resolved', date: '2026-09-20' })
      expect(resolve('3 בנובמבר')).toMatchObject({ status: 'resolved', date: '2026-11-03' })
    })

    it('resolves spoken word days with Hebrew month names', () => {
      expect(resolve('הראשון באוגוסט')).toMatchObject({ status: 'resolved', date: '2026-08-01' })
      expect(resolve('ראשון לאוגוסט')).toMatchObject({ status: 'resolved', date: '2026-08-01' })
      expect(resolve('העשרים בספטמבר')).toMatchObject({ status: 'resolved', date: '2026-09-20' })
    })

    it('resolves Hebrew month combined with exact time', () => {
      expect(resolve('15 באוגוסט ב-14:00')).toMatchObject({
        status: 'resolved',
        date: '2026-08-15',
        timeSlot: '14:00',
      })
    })

    it('rolls passed Hebrew month dates to next year with a note', () => {
      // Current date is 2026-07-22. July 10 has already passed.
      const passed = resolve('10 ביולי')
      expect(passed).toMatchObject({ status: 'resolved', date: '2027-07-10' })
      expect((passed as { note?: string }).note).toBeTruthy()
    })
  })

  describe('Day of Week + Date combined (Cross-Validation)', () => {
    it('resolves matching day and date', () => {
      // 2026-07-28 is indeed a Tuesday (שלישי)
      expect(resolve('יום שלישי ה-28.7')).toMatchObject({ status: 'resolved', date: '2026-07-28' })
      expect(resolve('שלישי 28.7')).toMatchObject({ status: 'resolved', date: '2026-07-28' })
      // 2026-07-23 is Thursday (חמישי)
      expect(resolve('יום חמישי 23.7')).toMatchObject({ status: 'resolved', date: '2026-07-23' })
      // 2026-07-29 is Wednesday (רביעי)
      expect(resolve('רביעי 29/7')).toMatchObject({ status: 'resolved', date: '2026-07-29' })
    })

    it('alerts with a note when day of week contradicts the date', () => {
      // 2026-07-27 is a Monday, but user wrote שלישי
      const mismatch = resolve('שלישי 27.7')
      expect(mismatch).toMatchObject({ status: 'resolved', date: '2026-07-27' })
      expect((mismatch as { note?: string }).note).toContain('יום שני ולא יום שלישי')
    })
  })

  describe('Alternative options ("או")', () => {
    it('returns ambiguous with both candidates for "X או Y"', () => {
      const res = resolve('ראשון או שני')
      expect(res.status).toBe('ambiguous')
      const candidates = (res as { candidates?: Array<{ date: string }> }).candidates
      expect(candidates).toHaveLength(2)
      expect(candidates?.[0]?.date).toBe('2026-07-26')
      expect(candidates?.[1]?.date).toBe('2026-07-27')
    })
  })

  describe('Part of month and week approximations', () => {
    it('returns candidates for תחילת חודש הבא / סוף חודש הבא', () => {
      const startNext = resolve('תחילת חודש הבא')
      expect(startNext.status).toBe('ambiguous')

      const midAugust = resolve('אמצע אוגוסט')
      expect(midAugust).toMatchObject({ status: 'resolved', date: '2026-08-15' })

      const startWeek = resolve('תחילת השבוע')
      expect(startWeek.status).toBe('ambiguous')

      const midWeek = resolve('אמצע השבוע')
      expect(midWeek.status).toBe('ambiguous')
    })
  })

  describe('Israeli Holidays', () => {
    it('resolves "אחרי החגים" to post-Sukkot 2026', () => {
      const res = resolve('אחרי החגים')
      expect(res).toMatchObject({ status: 'resolved', date: '2026-10-11' })
      expect((res as { note?: string }).note).toContain('אחרי החגים')
    })

    it('returns ambiguous for multi-day holidays like בפסח, בסוכות', () => {
      expect(resolve('בפסח').status).toBe('ambiguous')
      expect(resolve('בסוכות').status).toBe('ambiguous')
    })
  })

  describe('Preposition prefix ב- and spoken form', () => {
    it('strips preposition prefixes on numeric dates', () => {
      expect(resolve('ב-26.7')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
      expect(resolve('ב 26.7')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
      expect(resolve('ב26.7')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
      expect(resolve('ל-26.7')).toMatchObject({ status: 'resolved', date: '2026-07-26' })
    })

    it('formats spoken form according to LANG-4 convention', () => {
      expect(resolve('ראשון')).toMatchObject({ spoken: 'ראשון, 26.7' })
    })

    it('extracts coarse time of day phrases', () => {
      expect(resolve('חמישי בבוקר')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeOfDay: 'morning',
      })
      expect(resolve('ראשון בערב')).toMatchObject({
        status: 'resolved',
        date: '2026-07-26',
        timeOfDay: 'evening',
      })
      expect(resolve('על הבוקר מחר')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeOfDay: 'morning',
      })
      expect(resolve('מחר בשעות הערב')).toMatchObject({
        status: 'resolved',
        date: '2026-07-23',
        timeOfDay: 'evening',
      })
    })
  })

  describe('Vague expressions', () => {
    it('returns unrecognized for vague inputs', () => {
      expect(resolve('בקרוב').status).toBe('unrecognized')
      expect(resolve('מתישהו').status).toBe('unrecognized')
      expect(resolve('נראה').status).toBe('unrecognized')
    })
  })
})
