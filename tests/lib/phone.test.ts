import { describe, expect, it } from 'vitest'
import {
  extractPhoneCandidates,
  formatPhoneForDisplay,
  normalizePhoneForWhatsApp,
  normalizePhoneNumber,
  phoneMatchesQuery,
  toCanonicalE164Phone,
} from '@/lib/phone'

describe('Unified Phone Utilities (src/lib/phone.ts)', () => {
  describe('toCanonicalE164Phone', () => {
    it('converts domestic 05X format to +9725X', () => {
      expect(toCanonicalE164Phone('052-811-4746')).toBe('+972528114746')
      expect(toCanonicalE164Phone('0501234567')).toBe('+972501234567')
    })

    it('preserves existing +972 numbers', () => {
      expect(toCanonicalE164Phone('+972528114746')).toBe('+972528114746')
      expect(toCanonicalE164Phone('+972-52-811-4746')).toBe('+972528114746')
    })

    it('adds leading + to numbers starting with country code 972 without +', () => {
      expect(toCanonicalE164Phone('972528114746')).toBe('+972528114746')
    })
  })

  describe('normalizePhoneForWhatsApp', () => {
    it('converts domestic Israeli numbers to WhatsApp digits format (no +)', () => {
      expect(normalizePhoneForWhatsApp('052-811-4746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('+972528114746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('972528114746')).toBe('972528114746')
      expect(normalizePhoneForWhatsApp('0501234567')).toBe('972501234567')
    })
  })

  describe('normalizePhoneNumber', () => {
    it('ensures leading + for waIds', () => {
      expect(normalizePhoneNumber('972501234567')).toBe('+972501234567')
      expect(normalizePhoneNumber('+972501234567')).toBe('+972501234567')
    })
  })

  describe('extractPhoneCandidates', () => {
    it('returns domestic and international candidates for domestic phone', () => {
      const candidates = extractPhoneCandidates('052-811-4746')
      expect(candidates).toContain('052-811-4746')
      expect(candidates).toContain('0528114746')
      expect(candidates).toContain('972528114746')
      expect(candidates).toContain('+972528114746')
    })

    it('returns domestic and international candidates for +972 phone', () => {
      const candidates = extractPhoneCandidates('+972528114746')
      expect(candidates).toContain('+972528114746')
      expect(candidates).toContain('972528114746')
      expect(candidates).toContain('0528114746')
    })
  })

  describe('formatPhoneForDisplay', () => {
    it('normalizes +972 Israeli mobile numbers to 05X...', () => {
      expect(formatPhoneForDisplay('+972521113333')).toBe('0521113333')
      expect(formatPhoneForDisplay('+972501234567')).toBe('0501234567')
    })

    it('normalizes 972 without + to 05X...', () => {
      expect(formatPhoneForDisplay('972521113333')).toBe('0521113333')
    })

    it('preserves already domestic 05X numbers', () => {
      expect(formatPhoneForDisplay('0521113333')).toBe('0521113333')
    })

    it('strips dashes, spaces, and formatting', () => {
      expect(formatPhoneForDisplay('052-111-3333')).toBe('0521113333')
      expect(formatPhoneForDisplay('+972 52-111-3333')).toBe('0521113333')
      expect(formatPhoneForDisplay('+972-52-1113333')).toBe('0521113333')
    })

    it('handles empty and null values gracefully', () => {
      expect(formatPhoneForDisplay(null)).toBe('')
      expect(formatPhoneForDisplay(undefined)).toBe('')
      expect(formatPhoneForDisplay('')).toBe('')
      expect(formatPhoneForDisplay('   ')).toBe('')
    })

    it('preserves foreign international numbers', () => {
      expect(formatPhoneForDisplay('+14155552671')).toBe('+14155552671')
    })
  })

  describe('phoneMatchesQuery', () => {
    it('matches stored +972 number when searching with 05X query', () => {
      expect(phoneMatchesQuery('+972521113333', '052')).toBe(true)
      expect(phoneMatchesQuery('+972521113333', '0521113333')).toBe(true)
      expect(phoneMatchesQuery('+972521113333', '052-111')).toBe(true)
    })

    it('matches stored 05X number when searching with +972 query', () => {
      expect(phoneMatchesQuery('0521113333', '+97252')).toBe(true)
      expect(phoneMatchesQuery('0521113333', '97252')).toBe(true)
    })

    it('matches digits-only partial queries', () => {
      expect(phoneMatchesQuery('+972521113333', '52111')).toBe(true)
      expect(phoneMatchesQuery('0521113333', '1113333')).toBe(true)
    })

    it('returns false for non-matching queries or empty inputs', () => {
      expect(phoneMatchesQuery('+972521113333', '050')).toBe(false)
      expect(phoneMatchesQuery(null, '052')).toBe(false)
      expect(phoneMatchesQuery('+972521113333', '')).toBe(false)
    })
  })
})


