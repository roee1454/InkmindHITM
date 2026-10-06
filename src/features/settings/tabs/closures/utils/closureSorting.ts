export interface ClosureGroup {
  key: string
  reason: string
  ids: string[]
  dates: string[]
  isRecurring: boolean
  source: 'manual' | 'hebcal'
}

/**
 * Sorts closure groups prioritizing custom studio closures (manual) first,
 * then holidays (hebcal), ordered chronologically by upcoming date.
 */
export function sortClosureGroups(
  groups: ClosureGroup[],
  todayStr?: string,
): ClosureGroup[] {
  const today = todayStr ?? new Date().toISOString().slice(0, 10)

  return [...groups].sort((a, b) => {
    // Tier 1: Source priority — 'manual' (0) takes precedence over 'hebcal' (1)
    const tierA = a.source === 'manual' ? 0 : 1
    const tierB = b.source === 'manual' ? 0 : 1
    if (tierA !== tierB) {
      return tierA - tierB
    }

    // Tier 2: Chronological order — upcoming dates first
    const getTargetDate = (g: ClosureGroup) => {
      const upcoming = g.dates.find((d) => d >= today)
      if (upcoming) return { isUpcoming: true, date: upcoming }
      const latestPast = g.dates[g.dates.length - 1] ?? ''
      return { isUpcoming: false, date: latestPast }
    }

    const targetA = getTargetDate(a)
    const targetB = getTargetDate(b)

    if (targetA.isUpcoming && !targetB.isUpcoming) return -1
    if (!targetA.isUpcoming && targetB.isUpcoming) return 1

    const dateDiff = targetA.date.localeCompare(targetB.date)
    if (dateDiff !== 0) return dateDiff

    // Tier 3: Tie-breaker by reason name in Hebrew
    return a.reason.localeCompare(b.reason, 'he')
  })
}

