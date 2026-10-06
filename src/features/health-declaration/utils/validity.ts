export const DEFAULT_HEALTH_DECLARATION_VALIDITY_MONTHS = 6
export const HEALTH_DECLARATION_VALIDITY_DAYS = 180

/**
 * Checks whether a customer's health declaration is still valid based on studio policy.
 * @param dateStr Submission timestamp
 * @param validityMonthsOrNow Number of months valid (-1: never, 0: per-appointment, >0: months), or Date for legacy calls
 * @param maybeNow Evaluation timestamp
 */
export function isHealthDeclarationValid(
  dateStr?: string | null,
  validityMonthsOrNow: number | Date = DEFAULT_HEALTH_DECLARATION_VALIDITY_MONTHS,
  maybeNow: Date = new Date(),
): boolean {
  if (!dateStr) return false
  const validityMonths =
    typeof validityMonthsOrNow === 'number'
      ? validityMonthsOrNow
      : DEFAULT_HEALTH_DECLARATION_VALIDITY_MONTHS
  const now = validityMonthsOrNow instanceof Date ? validityMonthsOrNow : maybeNow

  if (validityMonths === -1) return true // Never expires
  if (validityMonths === 0) return false // Per-appointment (always requires renewal for new appointment)

  const submittedTime = new Date(dateStr).getTime()
  if (Number.isNaN(submittedTime)) return false
  const ageMs = now.getTime() - submittedTime
  if (ageMs < 0) return true
  const maxAgeMs = validityMonths * 30 * 24 * 60 * 60 * 1000
  return ageMs <= maxAgeMs
}

