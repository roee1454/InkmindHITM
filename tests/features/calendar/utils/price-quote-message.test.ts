import { describe, expect, it } from 'vitest'
import { buildPriceQuoteMessage, buildPriceQuoteMessages, healingGapLabel } from '@/features/calendar/utils/price-quote-message'
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
  depositPerSession: 'required',
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
    expect(message).toContain('💳 מקדמה לשריון המפגש הראשון: ₪300. לכל מפגש נגבית מקדמה משלו, שמקוזזת מהתשלום על אותו מפגש.')
  })

  it('says the deposit is taken once when the studio does not ask one per session', () => {
    expect(buildPriceQuoteMessage(tattoo({ estimatedSessions: 3, depositPerSession: 'not_required' }))).toContain('המקדמה נגבית פעם אחת, לשריון המפגש הראשון.')
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

  it('splits into two messages when health declaration is needed: summary and form link, neither having location', () => {
    const messages = buildPriceQuoteMessages(tattoo({ needsHealthDeclaration: true }))
    expect(messages).toHaveLength(2)
    const [summary, health] = messages
    expect(summary).toContain('🗓 מועד:')
    expect(summary).toContain('💰 מחיר משוער:')
    expect(summary).not.toContain('https://forms.example/health')
    expect(summary).not.toContain('שוהם מרקט')

    expect(health).toContain('https://forms.example/health')
    expect(health).toContain('הצהרת בריאות')
    expect(health).not.toContain('שוהם מרקט')
  })

  it('splits into two messages for paid tattoo when health is valid: summary and payment details, neither having location', () => {
    const messages = buildPriceQuoteMessages(tattoo({ needsHealthDeclaration: false, depositAmount: 300 }))
    expect(messages).toHaveLength(2)
    const [summary, payment] = messages
    expect(summary).toContain('🗓 מועד:')
    expect(summary).toContain('💰 מחיר משוער:')
    expect(summary).not.toContain('ביט 050-0000000')
    expect(summary).not.toContain('שוהם מרקט')

    expect(payment).toContain('ביט 050-0000000')
    expect(payment).toContain('מדיניות ביטול')
    expect(payment).toContain('צילום מסך של האסמכתה')
    expect(payment).not.toContain('שוהם מרקט')
  })

  it('returns single confirmed message with studio location for free consultation when health is valid', () => {
    const messages = buildPriceQuoteMessages(tattoo({ isSketch: true, depositAmount: 0, needsHealthDeclaration: false }))
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('פגישת הייעוץ ללא עלות.')
    expect(messages[0]).toContain('⏱ משך משוער: עד שעה.')
    expect(messages[0]).toContain('שוהם מרקט קומה מינוס אחת')
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
