import { describe, expect, it } from 'vitest'
import { buildPriceQuoteMessage, healingGapLabel } from '@/features/calendar/utils/price-quote-message'
import type { PriceQuoteMessageInput } from '@/features/calendar/utils/price-quote-message'

const tattoo = (overrides: Partial<PriceQuoteMessageInput> = {}): PriceQuoteMessageInput => ({
  isSketch: false,
  needsHealthDeclaration: false,
  when: 'שלישי, 14.10 בשעה 12:00',
  staffName: 'נועה',
  durationLabel: '3 שעות',
  priceMin: 1200,
  priceMax: 1500,
  depositAmount: 300,
  estimatedSessions: 1,
  healingPeriodDays: 21,
  paymentInstructions: 'ביט 050-0000000',
  cancellationPolicyText: 'מדיניות ביטול',
  healthFormUrl: 'https://forms.example/health',
  ...overrides,
})

describe('buildPriceQuoteMessage', () => {
  it('quotes a single-session tattoo as before, with no word about sessions', () => {
    const message = buildPriceQuoteMessage(tattoo())
    expect(message).toContain('🗓 מועד: שלישי, 14.10 בשעה 12:00 אצל נועה.')
    expect(message).toContain('💰 מחיר משוער: ₪1,200–1,500.')
    expect(message).toContain('💳 מקדמה לשריון: ₪300.')
    expect(message).toContain('ביט 050-0000000')
    expect(message).not.toContain('מפגשים')
  })

  it('tells the customer up front that the piece spreads over several sessions, priced per session', () => {
    const message = buildPriceQuoteMessage(tattoo({ estimatedSessions: 3 }))
    expect(message).toContain('💰 מחיר משוער לכל מפגש: ₪1,200–1,500.')
    expect(message).toContain('צפויה להתפרס על כ-3 מפגשים. זה המפגש הראשון, ואת הבאים נקבע בהפרש של כ-3 שבועות לצורך החלמה.')
  })

  it('says it may take more than one session when the artist does not know yet', () => {
    const message = buildPriceQuoteMessage(tattoo({ estimatedSessions: null }))
    expect(message).toContain('ייתכן שהעבודה תתפרס על יותר ממפגש אחד. האמן יעדכן אחרי המפגש הראשון.')
    expect(message).toContain('💰 מחיר משוער: ')
  })

  it('asks for the health declaration before payment when it is missing', () => {
    const message = buildPriceQuoteMessage(tattoo({ needsHealthDeclaration: true }))
    expect(message).toContain('https://forms.example/health')
    expect(message).not.toContain('ביט 050-0000000')
  })

  it('confirms a free consultation without price or sessions', () => {
    const message = buildPriceQuoteMessage(tattoo({ isSketch: true, depositAmount: 0, estimatedSessions: null }))
    expect(message).toContain('פגישת הייעוץ ללא עלות.')
    expect(message).not.toContain('מחיר משוער')
    expect(message).not.toContain('מפגש אחד')
  })
})

describe('healingGapLabel', () => {
  it('speaks in weeks when it can', () => {
    expect(healingGapLabel(7)).toBe('כשבוע')
    expect(healingGapLabel(14)).toBe('כשבועיים')
    expect(healingGapLabel(21)).toBe('כ-3 שבועות')
    expect(healingGapLabel(10)).toBe('כ-10 ימים')
  })
})
