/**
 * The calendar's one view control (track-b B6.8). It replaces the two toggles that used to
 * fight each other — `viewMode: calendar | table` and `calendarMode: day | week | month` —
 * with a single four-way choice, so "am I in list view or month view?" has one answer.
 */
export type CalendarViewMode = 'day' | 'week' | 'month' | 'list'

export const CALENDAR_VIEW_MODES: ReadonlyArray<{ id: CalendarViewMode; label: string }> = [
  { id: 'day', label: 'יום' },
  { id: 'week', label: 'שבוע' },
  { id: 'month', label: 'חודש' },
  { id: 'list', label: 'רשימה' },
]

/**
 * Seven ~40px day columns are unusable on a phone, so `week` and `month` render as `day` there.
 * Derived, never written back to the store: rotating a phone — or opening the same persisted
 * store on a desktop — must not strand a `day` mode where a week was intended.
 */
export function effectiveViewMode(mode: CalendarViewMode, isMobile: boolean): CalendarViewMode {
  if (!isMobile) return mode
  return mode === 'list' ? 'list' : 'day'
}

/** Whether the mode draws a time grid (and so needs hour rows and navigation by day/week/month). */
export function isGridMode(mode: CalendarViewMode): boolean {
  return mode !== 'list'
}
