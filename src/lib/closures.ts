export interface ClosureDate {
  date: string
  reason: string | null
  isRecurring: boolean
}

/** Pure matching logic shared between the server-side booking gate
 *  (features/settings/server/closures.ts's isStudioClosedOn, used by the AI bot) and the
 *  client-side staff booking warning (use-working-hours-check.ts) — same precedent as
 *  fitsWithinWorkingHours in ./working-hours.ts. Recurring closures match on month/day
 *  regardless of year; one-time closures match the exact date. */
export function matchClosureForDate(
  closures: ClosureDate[],
  dateStr: string,
): { closed: boolean; reason: string | null } {
  const targetMonthDay = dateStr.slice(5, 10) // MM-DD

  for (const closure of closures) {
    if (!closure.date) continue
    const matches = closure.isRecurring
      ? closure.date.slice(5, 10) === targetMonthDay
      : closure.date === dateStr
    if (matches) {
      return { closed: true, reason: closure.reason }
    }
  }

  return { closed: false, reason: null }
}
