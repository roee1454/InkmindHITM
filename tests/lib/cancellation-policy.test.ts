import { describe, expect, it } from 'vitest'
import {
  BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION,
  DEPOSIT_NOTICE_HOURS,
  customerCancellationPolicyText,
  depositStaffSummary,
  isShortNoticeForDeposit,
} from '@/lib/cancellation-policy'

describe('cancellation policy', () => {
  it('words the customer-facing policy once, honouring a free-cancellation setting of 0 hours', () => {
    expect(customerCancellationPolicyText(48)).toBe(
      'מדיניות ביטולים:\n• ביטול עצמאי אפשרי עד 48 שעות לפני המועד.\n• ביטול פחות משבוע מראש — המקדמה אינה מוחזרת.',
    )
    expect(customerCancellationPolicyText(0)).toContain('ביטול עצמאי אפשרי בכל עת.')
  })

  it('classifies notice against the one-week deposit window', () => {
    expect(isShortNoticeForDeposit(DEPOSIT_NOTICE_HOURS - 1)).toBe(true)
    expect(isShortNoticeForDeposit(DEPOSIT_NOTICE_HOURS)).toBe(false)
  })

  it('gives staff the policy context without the bot ever ruling on the deposit', () => {
    expect(depositStaffSummary(null, 10)).toBe('לא שולמה מקדמה')
    expect(depositStaffSummary(150, 72)).toBe('שולמה מקדמה (₪150) — ביטול פחות משבוע מראש: לפי המדיניות המקדמה אינה מוחזרת (לבדיקתך)')
    expect(depositStaffSummary(150, 200)).toContain('המקדמה להסדרה מול הלקוח')
    expect(BOT_DEPOSIT_FOLLOW_UP_INSTRUCTION).not.toMatch(/אינה מוחזרת|אינה ניתנת להחזר/)
  })
})
