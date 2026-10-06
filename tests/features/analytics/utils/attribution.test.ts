import { describe, it, expect } from 'vitest'
import {
  detectCustomerSource,
  detectSourceFromText,
  isSurveySourceQuestion,
  extractSourceFromSurveyAnswer,
} from '@/features/analytics/utils/attribution'
import type { RawReferral } from '@/integrations/whatsapp-cloud-api/types'

describe('Analytics Attribution Engine', () => {
  describe('detectSourceFromText', () => {
    it('detects instagram from various Hebrew phrasings', () => {
      expect(detectSourceFromText('היי ראיתי אותך באינסטגרם')).toBe('instagram')
      expect(detectSourceFromText('הגעתי מהאינסטה')).toBe('instagram')
      expect(detectSourceFromText('ראיתי ב-ig סטורי')).toBe('instagram')
    })

    it('detects tiktok from various phrasings', () => {
      expect(detectSourceFromText('היי הגעתי דרך הטיקטוק')).toBe('tiktok')
      expect(detectSourceFromText('ראיתי סרטון ב-tiktok')).toBe('tiktok')
      expect(detectSourceFromText('הגעתי מטיק טוק')).toBe('tiktok')
    })

    it('detects facebook', () => {
      expect(detectSourceFromText('ראיתי מודעה בפייסבוק')).toBe('facebook')
      expect(detectSourceFromText('הגעתי מפייס')).toBe('facebook')
    })

    it('detects google', () => {
      expect(detectSourceFromText('מצאתי אתכם בגוגל')).toBe('google')
      expect(detectSourceFromText('חיפשתי סטודיו קעקועים ב google')).toBe('google')
    })

    it('detects website', () => {
      expect(detectSourceFromText('ראיתי באתר שלכם')).toBe('website')
      expect(detectSourceFromText('הגעתי דרך האתר')).toBe('website')
    })

    it('detects word-of-mouth referral', () => {
      expect(detectSourceFromText('חבר המליץ עליך בחום')).toBe('referral')
      expect(detectSourceFromText('קיבלתי המלצה מדני')).toBe('referral')
      expect(detectSourceFromText('הגעתי מפה לאוזן')).toBe('referral')
    })

    it('detects walk-in', () => {
      expect(detectSourceFromText('עברתי ברחוב וראיתי את הסטודיו')).toBe('walk-in')
      expect(detectSourceFromText('נכנסתי סתם ככה')).toBe('walk-in')
    })

    it('returns unknown when text contains no attribution clues', () => {
      expect(detectSourceFromText('היי אני רוצה לקבוע תור לקעקוע קטן ביד')).toBe('unknown')
      expect(detectSourceFromText('')).toBe('unknown')
    })
  })

  describe('detectCustomerSource', () => {
    it('prioritizes referral object from Meta Ads', () => {
      const referral: RawReferral = {
        source_type: 'ad',
        source_id: '123456789',
        source_url: 'https://instagram.com/p/xyz',
        headline: 'קמפיין קעקועים סתיו',
      }
      // Even if text says something else, ad referral is authoritative
      const res = detectCustomerSource({
        referral,
        text: { body: 'שלום ראיתי בגוגל' },
      })
      expect(res.source).toBe('instagram')
      expect(res.referral).toEqual(referral)
    })

    it('identifies facebook ads from referral object', () => {
      const referral: RawReferral = {
        source_type: 'ad',
        source_id: '123456789',
        source_url: 'https://fb.me/xyz',
      }
      const res = detectCustomerSource({ referral })
      expect(res.source).toBe('facebook')
    })

    it('identifies tiktok ads if source_url contains tiktok', () => {
      const referral: RawReferral = {
        source_type: 'ad',
        source_id: '987',
        source_url: 'https://tiktok.com/@studio',
      }
      const res = detectCustomerSource({ referral })
      expect(res.source).toBe('tiktok')
    })

    it('defaults ad referral without url hints to instagram (primary studio ad platform)', () => {
      const referral: RawReferral = {
        source_type: 'ad',
        source_id: '12345',
      }
      const res = detectCustomerSource({ referral })
      expect(res.source).toBe('instagram')
    })

    it('identifies post referrals from source_url', () => {
      const referral: RawReferral = {
        source_type: 'post',
        source_url: 'https://instagram.com/reel/123',
      }
      const res = detectCustomerSource({ referral })
      expect(res.source).toBe('instagram')
    })

    it('falls back to text analysis when referral has no platform hints', () => {
      const res = detectCustomerSource({
        text: { body: 'הגעתי דרך הטיקטוק שלכם' },
      })
      expect(res.source).toBe('tiktok')
    })

    it('returns unknown when message has no referral and non-matching text', () => {
      const res = detectCustomerSource({
        text: { body: 'שלום רציתי לדעת מה המחיר' },
      })
      expect(res.source).toBe('unknown')
    })

    it('handles null/undefined message gracefully', () => {
      expect(detectCustomerSource(null).source).toBe('unknown')
      expect(detectCustomerSource(undefined).source).toBe('unknown')
    })
  })

  describe('Health Declaration / Intake Form attribution questions', () => {
    it('identifies source attribution survey questions', () => {
      expect(isSurveySourceQuestion('איך הגעת אלינו?')).toBe(true)
      expect(isSurveySourceQuestion('איך שמעת על הסטודיו?')).toBe(true)
      expect(isSurveySourceQuestion('כיצד שמעת עלינו')).toBe(true)
      expect(isSurveySourceQuestion('מקור הגעה')).toBe(true)
      expect(isSurveySourceQuestion('How did you hear about us?')).toBe(true)
      expect(isSurveySourceQuestion('האם את/ה בהריון?')).toBe(false)
      expect(isSurveySourceQuestion('האם יש לך סוכרת?')).toBe(false)
    })

    it('extracts source from survey answers', () => {
      expect(extractSourceFromSurveyAnswer('אינסטגרם')).toBe('instagram')
      expect(extractSourceFromSurveyAnswer('חבר המליץ')).toBe('referral')
      expect(extractSourceFromSurveyAnswer('ראיתי בטיק טוק')).toBe('tiktok')
      expect(extractSourceFromSurveyAnswer(['חברה', 'המלצה'])).toBe('referral')
      expect(extractSourceFromSurveyAnswer(null)).toBe('unknown')
      expect(extractSourceFromSurveyAnswer('')).toBe('unknown')
    })
  })
})

