import type { RawMessage, RawReferral } from '@/integrations/whatsapp-cloud-api/types'
import type { CustomerSource } from '@/features/customers/types'

export interface AttributionResult {
  source: CustomerSource
  referral?: RawReferral
}

/**
 * Detects customer acquisition source from an incoming raw WhatsApp message.
 * Inspects:
 * 1. Meta CTWA (Click-to-WhatsApp) ad/post referral metadata
 * 2. Pre-filled text keywords (e.g. from wa.me links in Instagram/TikTok bio or website)
 */
export function detectCustomerSource(msg?: Partial<RawMessage> | null): AttributionResult {
  if (!msg) {
    return { source: 'unknown' }
  }

  // 1. Meta Referral object (Click-to-WhatsApp Ads or organic posts)
  if (msg.referral) {
    const ref = msg.referral
    const sourceUrl = (ref.source_url || '').toLowerCase()
    const headline = (ref.headline || '').toLowerCase()
    const body = (ref.body || '').toLowerCase()

    if (sourceUrl.includes('tiktok') || headline.includes('tiktok') || body.includes('tiktok')) {
      return { source: 'tiktok', referral: ref }
    }
    if (sourceUrl.includes('instagram') || sourceUrl.includes('ig.me') || headline.includes('instagram') || body.includes('instagram')) {
      return { source: 'instagram', referral: ref }
    }
    if (sourceUrl.includes('facebook') || sourceUrl.includes('fb.me') || sourceUrl.includes('fb.com') || headline.includes('facebook') || body.includes('facebook')) {
      return { source: 'facebook', referral: ref }
    }
    // Default for Meta Ads (most tattoo studio ads run on Instagram or Meta network)
    if (ref.source_type === 'ad') {
      return { source: 'instagram', referral: ref }
    }
  }

  // 2. Pre-filled or inbound text analysis
  const textBody = msg.text?.body?.trim()
  if (textBody) {
    const detected = detectSourceFromText(textBody)
    if (detected !== 'unknown') {
      return { source: detected, referral: msg.referral }
    }
  }

  return { source: 'unknown', referral: msg.referral }
}

/**
 * Parses pre-filled text or natural user message keywords to identify the source.
 */
export function detectSourceFromText(text: string): CustomerSource {
  const normalized = text.toLowerCase()

  if (/אינסטגרם|אינסטה|instagram|\big\b/i.test(normalized)) {
    return 'instagram'
  }
  if (/טיקטוק|טיק טוק|tiktok|\btt\b/i.test(normalized)) {
    return 'tiktok'
  }
  if (/פייסבוק|facebook|\bfb\b|פייס/i.test(normalized)) {
    return 'facebook'
  }
  if (/גוגל|google/i.test(normalized)) {
    return 'google'
  }
  if (/האתר|באתר|אתר אינטרנט|website|\bweb\b/i.test(normalized)) {
    return 'website'
  }
  if (/המלצה|חבר|חברה|המליץ|המליצה|מפה לאוזן/i.test(normalized)) {
    return 'referral'
  }
  if (/כרטיס ביקור|שלט|עברתי ברחוב|עברתי ליד|נכנסתי סתם|בסטודיו|ווק.?אין|walk.?in/i.test(normalized)) {
    return 'walk-in'
  }

  return 'unknown'
}

/**
 * Checks if a question from the health declaration / intake form represents customer source attribution.
 */
export function isSurveySourceQuestion(questionKey: string): boolean {
  const q = questionKey.trim().toLowerCase()
  return (
    q.includes('איך שמעת') ||
    q.includes('איך הגעת') ||
    q.includes('כיצד שמעת') ||
    q.includes('כיצד הגעת') ||
    q.includes('מאיפה הגעת') ||
    q.includes('מאיפה שמעת') ||
    q.includes('מקור הגעה') ||
    q.includes('איך מצאת') ||
    q.includes('how did you hear') ||
    q.includes('how did you find')
  )
}

/**
 * Maps survey answer choices to standard CustomerSource.
 */
export function extractSourceFromSurveyAnswer(rawAnswer: unknown): CustomerSource {
  if (rawAnswer == null) return 'unknown'
  const val = Array.isArray(rawAnswer) ? rawAnswer.join(' ') : String(rawAnswer)
  const source = detectSourceFromText(val)
  return source
}

