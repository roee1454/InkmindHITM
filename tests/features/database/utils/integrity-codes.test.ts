import { describe, expect, it } from 'vitest'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'

describe('parseIntegrityViolation', () => {
  it('recognises the codes thrown by pb_hooks, including after PocketBase sentenizes them', () => {
    expect(parseIntegrityViolation('integrity:customer_has_active_appointments')).toBe('customer_has_active_appointments')
    expect(parseIntegrityViolation('Integrity:customer_has_active_appointments.')).toBe('customer_has_active_appointments')
    expect(parseIntegrityViolation('  Integrity:last_owner. ')).toBe('last_owner')
  })

  it('returns null for anything else', () => {
    expect(parseIntegrityViolation('Failed to delete record.')).toBeNull()
    expect(parseIntegrityViolation(undefined)).toBeNull()
    expect(parseIntegrityViolation(42)).toBeNull()
  })
})
