import { describe, expect, it } from 'vitest'
import { defaultBookingScope, followUpStaffNote, touchUpTerms } from '@/integrations/ai/tools/booking-scope'

const now = new Date('2026-10-01T12:00:00Z')

describe('defaultBookingScope', () => {
  it('books the next session for a customer between sessions, and a new piece otherwise', () => {
    expect(defaultBookingScope('PROJECT_IN_PROGRESS')).toBe('next_session')
    expect(defaultBookingScope('COMPLETED')).toBe('new_project')
    expect(defaultBookingScope('NEW')).toBe('new_project')
  })
})

describe('touchUpTerms', () => {
  it('sends every touch-up to staff until the studio decides the policy', () => {
    expect(touchUpTerms({ kind: 'undecided' }, '2026-09-25T12:00:00Z', now)).toBe('ask_staff')
  })

  it('is free within the free period after the piece was finished, and charged after it', () => {
    const rule = { kind: 'free_within_days', days: 30 } as const
    expect(touchUpTerms(rule, '2026-09-10T12:00:00Z', now)).toBe('free')
    expect(touchUpTerms(rule, '2026-08-01T12:00:00Z', now)).toBe('charged')
    // Still in progress: nothing finished yet, so still within the period.
    expect(touchUpTerms(rule, null, now)).toBe('free')
  })

  it('is charged when the studio charges for touch-ups', () => {
    expect(touchUpTerms({ kind: 'charged' }, '2026-09-30T12:00:00Z', now)).toBe('charged')
  })
})

describe('followUpStaffNote', () => {
  it('tells staff a next session needs no deposit only when the studio decided so', () => {
    expect(followUpStaffNote('next_session', undefined, 'not_required')?.detail).toContain('לא נדרשת מקדמה')
    expect(followUpStaffNote('next_session', undefined, 'required')?.detail).toContain('הזן מקדמה')
  })

  it('tells staff whether a touch-up is charged', () => {
    expect(followUpStaffNote('touch_up', 'free', 'required')?.detail).toContain('ללא חיוב')
    expect(followUpStaffNote('touch_up', 'charged', 'required')?.detail).toContain('בתשלום')
  })

  it('adds nothing to a new booking', () => {
    expect(followUpStaffNote('new_project', undefined, 'required')).toBeNull()
    expect(followUpStaffNote(undefined, undefined, 'required')).toBeNull()
  })
})
