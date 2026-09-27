import { describe, expect, it } from 'vitest'
import { awaitsReceiptApproval } from '#/features/dashboard/utils/alerts'

describe('awaitsReceiptApproval', () => {
  it('flags a pending hold with a screenshot and no confirmed deposit', () => {
    expect(awaitsReceiptApproval({ status: 'pending', payment_receipt_url: 'r.jpg', deposit_paid: false })).toBe(true)
  })

  it('does not flag a hold with no screenshot yet — there is nothing to check', () => {
    expect(awaitsReceiptApproval({ status: 'pending', payment_receipt_url: '', deposit_paid: false })).toBe(false)
  })

  it('does not flag a hold whose deposit is already confirmed', () => {
    expect(awaitsReceiptApproval({ status: 'pending', payment_receipt_url: 'r.jpg', deposit_paid: true })).toBe(false)
  })

  it('does not nag about appointments that are settled or over', () => {
    for (const status of ['confirmed', 'completed', 'cancelled', 'no_show']) {
      expect(awaitsReceiptApproval({ status, payment_receipt_url: 'r.jpg', deposit_paid: false })).toBe(false)
    }
  })
})
