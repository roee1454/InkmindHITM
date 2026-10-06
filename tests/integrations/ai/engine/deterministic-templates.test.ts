import { describe, expect, it } from 'vitest'
import {
  DETERMINISTIC_TEMPLATES,
  STUDIO_LOCATION_TEXT,
} from '@/integrations/ai/engine/deterministic-templates'

describe('DETERMINISTIC_TEMPLATES', () => {
  describe('artistsList', () => {
    it('formats a clean list of studio artists with only names and portfolios, without bios', () => {
      const output = DETERMINISTIC_TEMPLATES.artistsList({
        artists: [
          { name: 'דור חיילי', portfolioUrl: 'https://inkmindtattoos.com/dor' },
          { name: 'רואי חיילי', portfolioUrl: 'https://inkmindtattoos.com/roee' },
        ],
      })

      expect(output).toContain('יש לנו אמנים מעולים בסטודיו:')
      expect(output).toContain('דור חיילי')
      expect(output).toContain('רואי חיילי')
      expect(output).toContain('https://inkmindtattoos.com/dor')
      expect(output).toContain('https://inkmindtattoos.com/roee')
      expect(output).toContain('עם מי מהם תרצה לקבוע ואיזה ימים נוחים לך?')
      // Strictly without bio clutter
      expect(output).not.toContain('מתמחה')
      expect(output).not.toContain('ריאליזם')
    })
  })

  describe('healthDeclarationNotice', () => {
    it('formats the isolated health declaration notice with exact form URL', () => {
      const output = DETERMINISTIC_TEMPLATES.healthDeclarationNotice({
        formUrl: 'https://forms.google.com/test-health-declaration',
      })

      expect(output).toContain('📝 הצהרת בריאות:')
      expect(output).toContain('https://forms.google.com/test-health-declaration')
      expect(output).toContain('לפני שנוכל לשריין את התור במערכת, יש למלא הצהרת בריאות קצרה ומאובטחת בקישור הבא:')
    })
  })

  describe('staffEscalated', () => {
    it('returns the standard professional handover message', () => {
      const output = DETERMINISTIC_TEMPLATES.staffEscalated()

      expect(output).toContain('העברתי את השיחה לבדיקת צוות הסטודיו')
      expect(output).toContain('אחד המקעקעים או מנהל הסטודיו יחזור אליך כאן בהקדם האפשרי! 🙏')
    })
  })

  describe('sketchHeld', () => {
    it('sets customer expectation for team review without false finality and excludes studio location line', () => {
      const output = DETERMINISTIC_TEMPLATES.sketchHeld({
        artistName: 'דור חיילי',
        dateYmd: '2026-10-05',
        timeSlot: '17:00',
      })

      expect(output).toContain('מעולה! שריינתי לך את המשבצת במערכת')
      expect(output).toContain('יום שני ה-5.10 בשעה 17:00 אצל דור חיילי')
      expect(output).toContain('והעברתי את הפרטים לבדיקת צוות הסטודיו')
      expect(output).toContain('נחזור אליך כאן בהקדם עם אישור ופרטים לשריון!')
      expect(output).not.toContain(STUDIO_LOCATION_TEXT)
      expect(output).not.toContain('סגור לגמרי, קבענו')
    })
  })

  describe('bookingConfirmed', () => {
    it('includes the full studio location line in the final confirmed message', () => {
      const output = DETERMINISTIC_TEMPLATES.bookingConfirmed({
        artistName: 'רואי חיילי',
        dateYmd: '2026-10-05',
        timeSlot: '14:00',
      })

      expect(output).toContain('איזה כיף, התור שלך נקבע רשמית! 🎉')
      expect(output).toContain(`📍 איפה: ${STUDIO_LOCATION_TEXT}`)
    })
  })
})
