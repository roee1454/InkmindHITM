import { describe, expect, it } from 'vitest'
import {
  FORBIDDEN_MESSAGE,
  NOT_FOUND_MESSAGE,
  blockerMessage,
  collectionLabel,
  describeDeleteFailure,
  formatAppointmentSlot,
} from '@/features/database/utils/delete-messages'
import { parseStaleReference } from '@/lib/stale-reference'

describe('delete messages', () => {
  it('labels known collections in Hebrew and falls back to the raw name', () => {
    expect(collectionLabel('messages')).toBe('הודעות בצ׳אט')
    expect(collectionLabel('something_new')).toBe('something_new')
  })

  it('explains each blocker', () => {
    const one = { id: 'a', startTime: '2026-10-01T10:00:00Z', status: 'confirmed', staffName: null }
    expect(blockerMessage({ code: 'active_appointments', appointments: [one] })).toContain('תור עתידי פעיל')
    expect(blockerMessage({ code: 'active_appointments', appointments: [one, { ...one, id: 'b' }] })).toContain('2 תורים')
    expect(blockerMessage({ code: 'last_owner' })).toContain('הבעלים היחיד')
    expect(blockerMessage({ code: 'self_delete' })).toContain('המשתמש שלך')
    expect(blockerMessage({ code: 'restricted_relation', collection: 'messages', count: 3 })).toBe('3 הודעות בצ׳אט מונעים את המחיקה.')
  })

  it('explains that payment history is kept rather than counting it as a generic blocker', () => {
    const message = blockerMessage({ code: 'restricted_relation', collection: 'payments', count: 2 })
    expect(message).toContain('היסטוריית תשלומים (2 תשלומים רשומים)')
    expect(message).toContain('אי אפשר למחוק את הלקוח')
  })

  it('turns failed deletes into errors, with a stale-reference code for missing records', () => {
    const missing = describeDeleteFailure('appointments', { status: 'not_found' })
    expect(parseStaleReference(missing)).toBe('appointments')
    expect(missing.message).toContain(NOT_FOUND_MESSAGE)
    expect(describeDeleteFailure('customers', { status: 'forbidden' }).message).toBe(FORBIDDEN_MESSAGE)
    expect(describeDeleteFailure('staff', { status: 'blocked', blocker: { code: 'last_owner' } }).message).toContain('הבעלים')
    expect(describeDeleteFailure('staff', { status: 'failed', message: 'boom' }).message).toBe('boom')
  })

  it('formats an appointment slot compactly and survives bad input', () => {
    const local = new Date(2026, 8, 29, 14, 5)
    expect(formatAppointmentSlot(local.toISOString())).toBe('יום ג׳ 29.9 · 14:05')
    expect(formatAppointmentSlot('not-a-date')).toBe('not-a-date')
  })
})
