/**
 * Integrity rules enforced inside PocketBase (pocketbase/pb_hooks/lib/data-integrity.js) reject a
 * delete by throwing a BadRequestError whose message is one of these codes. Keep both in sync;
 * tests/integration/data-integrity.test.ts asserts every code round-trips.
 */
export type IntegrityViolation =
  | 'customer_has_active_appointments'
  | 'last_owner'
  | 'project_customer_mismatch'
  | 'completion_requires_final_price'

const VIOLATION_BY_MESSAGE = new Map<string, IntegrityViolation>([
  ['integrity:customer_has_active_appointments', 'customer_has_active_appointments'],
  ['integrity:last_owner', 'last_owner'],
  ['integrity:project_customer_mismatch', 'project_customer_mismatch'],
  ['integrity:completion_requires_final_price', 'completion_requires_final_price'],
])

/**
 * PocketBase "sentenizes" API error messages before sending them ("integrity:last_owner" arrives
 * as "Integrity:last_owner."), so the comparison is case-insensitive and ignores a trailing period.
 */
export function parseIntegrityViolation(message: unknown): IntegrityViolation | null {
  if (typeof message !== 'string') return null
  const normalized = message.trim().toLowerCase().replace(/\.$/, '')
  return VIOLATION_BY_MESSAGE.get(normalized) ?? null
}
