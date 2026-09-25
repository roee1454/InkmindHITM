import type { WorkingHoursWindow } from '@/features/settings/server/settings'

/**
 * Pure function to format a compact summary of working hours.
 * e.g. "5 ימים · 11:00-19:00", "3 ימים מוגדרים", or "לא הוגדרו שעות"
 */
export function summarizeWorkingHours(windows: WorkingHoursWindow[] | undefined | null): string {
  if (!windows || windows.length === 0) {
    return 'לא הוגדרו שעות'
  }

  const daysCount = windows.length
  const first = windows[0]

  if (!first || !first.startTime || !first.endTime) {
    return `${daysCount} ימים מוגדרים`
  }

  const allSame = windows.every(
    (w) => w.startTime === first.startTime && w.endTime === first.endTime,
  )

  if (allSame) {
    return `${daysCount} ימים · ${first.startTime}-${first.endTime}`
  }

  return `${daysCount} ימים מוגדרים`
}

