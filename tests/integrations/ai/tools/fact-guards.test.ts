import { describe, expect, it } from 'vitest'
import { applyFactGuards, isHoldReadyToConfirm, toConversationFacts } from '@/integrations/ai/tools/fact-guards'

const GUARDED = ['request_cancel', 'request_reschedule', 'flag_earlier_preference', 'confirm_booking_final']
const all = [...GUARDED, 'answer_faq', 'call_staff', 'send_message']

const allowed = (appointments: Array<Record<string, unknown>>) => applyFactGuards(all, toConversationFacts(appointments))

describe('applyFactGuards', () => {
  it('removes every appointment tool when the customer has nothing upcoming, whatever the state says', () => {
    expect(allowed([])).toEqual(['answer_faq', 'call_staff', 'send_message'])
  })

  it('offers cancelling and rescheduling for a hold, but not bringing it forward or confirming it before the deposit', () => {
    expect(allowed([{ status: 'pending', deposit_amount: 300, deposit_paid: false }])).toEqual(['request_cancel', 'request_reschedule', 'answer_faq', 'call_staff', 'send_message'])
  })

  it('offers confirming a hold once its deposit is settled, or when none is due', () => {
    expect(allowed([{ status: 'pending', deposit_amount: 300, deposit_paid: true }])).toContain('confirm_booking_final')
    expect(allowed([{ status: 'pending', deposit_amount: 0, deposit_paid: false }])).toContain('confirm_booking_final')
  })

  it('offers bringing forward only a confirmed appointment', () => {
    const tools = allowed([{ status: 'confirmed', deposit_amount: 300, deposit_paid: true }])
    expect(tools).toContain('flag_earlier_preference')
    expect(tools).not.toContain('confirm_booking_final')
  })

  it('leaves tools it has no rule for untouched, in order', () => {
    expect(applyFactGuards(['send_message', 'answer_faq'], toConversationFacts([]))).toEqual(['send_message', 'answer_faq'])
  })

  it('ignores appointments that are neither pending nor confirmed', () => {
    expect(toConversationFacts([{ status: 'cancelled' }, { status: 'completed' }]).upcoming).toEqual([])
  })
})

describe('isHoldReadyToConfirm', () => {
  it('needs a pending hold whose deposit is settled', () => {
    expect(isHoldReadyToConfirm({ status: 'pending', deposit_amount: 300, deposit_paid: true })).toBe(true)
    expect(isHoldReadyToConfirm({ status: 'pending', deposit_amount: 300, deposit_paid: false })).toBe(false)
    expect(isHoldReadyToConfirm({ status: 'confirmed', deposit_amount: 0 })).toBe(false)
  })
})
