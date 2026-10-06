import { describe, expect, it } from 'vitest'
import { appointmentFacts, resolveThreadAction } from '@/features/conversations/utils/thread-action'
import { collectThreadMedia } from '@/features/conversations/utils/thread-media'
import { attentionLabel, inboxBucket } from '@/features/conversations/utils/labels'
import type { UIAppointmentSummary, UIMessage } from '@/features/conversations/types'

const appointment = (overrides: Partial<UIAppointmentSummary> = {}): UIAppointmentSummary => ({
  id: 'a1',
  status: 'pending',
  type: 'tattoo',
  tattooDescription: '',
  staffName: 'מרב',
  date: '2026-10-01',
  timeSlot: '12:00',
  durationMinutes: 120,
  priceMinIls: 600,
  priceMaxIls: 800,
  depositAmount: 200,
  depositPaid: false,
  slotConfirmed: true,
  ...overrides,
})

const conv = (fields: { state?: string; status?: string; staffCallReason?: string | null }) => ({
  state: 'COLLECTING_INFO',
  status: 'bot_active',
  staffCallReason: null,
  ...fields,
})

describe('resolveThreadAction', () => {
  it('asks for a quote, or a sketch approval, while the bot waits on pricing', () => {
    expect(resolveThreadAction(conv({ state: 'AWAIT_PRICE_OFFER' }), appointment(), false)).toEqual({ kind: 'price_offer', isSketch: false })
    expect(resolveThreadAction(conv({ state: 'AWAIT_PRICE_OFFER' }), appointment({ type: 'sketch' }), false)).toMatchObject({ isSketch: true })
  })

  it('carries the deposit and whether a receipt arrived, and never invents an amount', () => {
    expect(resolveThreadAction(conv({ state: 'AWAIT_PAYMENT', staffCallReason: 'receipt_verification' }), appointment(), true)).toEqual({
      kind: 'payment',
      depositAmount: 200,
      hasReceipt: true,
      canAskForClearerReceipt: true,
    })
    expect(resolveThreadAction(conv({ state: 'AWAIT_PAYMENT' }), null, false)).toMatchObject({ depositAmount: null, canAskForClearerReceipt: false })
  })

  it('waits quietly while the customer has to act', () => {
    expect(resolveThreadAction(conv({ state: 'AWAIT_HEALTH_NOTICE' }), appointment(), false)).toEqual({ kind: 'waiting', on: 'health' })
    expect(resolveThreadAction(conv({ state: 'AWAIT_FINAL_CONFIRMATION' }), appointment(), false)).toEqual({ kind: 'waiting', on: 'final_confirmation' })
  })

  it('handles a slot conflict only when there is an appointment to confirm', () => {
    expect(resolveThreadAction(conv({ staffCallReason: 'slot_conflict' }), appointment(), false)).toEqual({ kind: 'slot_conflict' })
    expect(resolveThreadAction(conv({ staffCallReason: 'slot_conflict' }), null, false)).toMatchObject({ kind: 'attention', next: 'book' })
  })

  it('offers booking the tattoo once a sketch is done, before any generic escalation', () => {
    const sketch = appointment({ type: 'sketch', status: 'completed' })
    expect(resolveThreadAction(conv({ state: 'WANTS_TO_BOOK', status: 'escalated' }), sketch, false)).toEqual({ kind: 'sketch_done', appointmentId: 'a1', staffName: 'מרב' })
  })

  it('on an escalation, points at the next step the appointment is missing', () => {
    expect(resolveThreadAction(conv({ status: 'escalated' }), null, false)).toMatchObject({ kind: 'attention', next: 'book', reason: null })
    expect(resolveThreadAction(conv({ staffCallReason: 'complaint' }), appointment(), false)).toMatchObject({ next: 'quote', reason: 'תלונה' })
    expect(resolveThreadAction(conv({ status: 'escalated' }), appointment({ status: 'confirmed' }), false)).toMatchObject({ next: null })
  })

  it('asks nothing of a conversation the bot is handling', () => {
    expect(resolveThreadAction(conv({}), appointment(), false)).toEqual({ kind: 'none' })
  })
})

describe('appointmentFacts', () => {
  it('reads as one line: slot, artist, quote', () => {
    expect(appointmentFacts(appointment())).toBe('ה׳ 1.10 · 12:00 · מרב · ⁦₪600–800⁩')
    expect(appointmentFacts(appointment({ staffName: null, priceMinIls: null, priceMaxIls: null }))).toBe('ה׳ 1.10 · 12:00')
    expect(appointmentFacts(null)).toBe('')
  })
})

describe('attentionLabel and inboxBucket', () => {
  it('names why a person has to step in, and files it under "waiting" whoever is answering', () => {
    expect(attentionLabel({ state: 'AWAIT_PAYMENT', status: 'bot_active' })).toBe('מקדמה לאישור')
    expect(inboxBucket({ state: 'AWAIT_PAYMENT', status: 'bot_active' })).toBe('escalated')
    expect(attentionLabel({ staffCallReason: 'cancel_request' })).toBe('בקשת ביטול')
    expect(attentionLabel({ status: 'escalated' })).toBe('ממתין למענה')
    expect(attentionLabel({ state: 'AWAIT_HEALTH_NOTICE', status: 'bot_active' })).toBeNull()
    expect(inboxBucket({ status: 'bot_active' })).toBe('bot_active')
    expect(inboxBucket({ status: 'staff_handling' })).toBe('staff_handling')
  })
})

describe('collectThreadMedia', () => {
  const image = (id: string, fields: Partial<UIMessage> = {}): UIMessage => ({
    id,
    direction: 'inbound',
    senderType: 'customer',
    type: 'image',
    body: '',
    mediaFilename: `${id}.jpg`,
    status: null,
    timestamp: '2026-09-28T10:00:00.000Z',
    replyToWamid: null,
    errorDetail: null,
    seen: true,
    mediaCategory: null,
    ...fields,
  })

  it('treats any customer image as a receipt while a deposit is due', () => {
    const media = collectThreadMedia([image('m1'), image('m2')], null, { state: 'AWAIT_PAYMENT', staffCallReason: null })
    expect(media.inspirationImages).toHaveLength(0)
    expect(media.receipts).toHaveLength(2)
    expect(media.latestReceiptUrl).toContain('m2')
  })

  it('keeps inspiration apart, and falls back to the receipt on the appointment', () => {
    const media = collectThreadMedia([image('m1')], appointment({ paymentReceiptUrl: 'https://x/receipt.jpg' }), { state: 'COLLECTING_INFO', staffCallReason: null })
    expect(media.inspirationImages).toHaveLength(1)
    expect(media.latestReceiptUrl).toBe('https://x/receipt.jpg')
  })
})
