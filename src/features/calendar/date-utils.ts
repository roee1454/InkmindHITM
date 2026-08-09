export {
  HEBREW_DAYS_SHORT,
  HEBREW_DAYS_LONG,
  HEBREW_MONTHS,
  toYmd,
  fromYmd,
  addDays,
  addMonths,
  startOfWeek,
  buildMonthMatrix,
  isSameDay,
  isToday,
  isSameMonth,
  formatMonthTitle,
  timeToMinutes,
  minutesToTime,
} from '@/lib/date-utils'

import { addDays, startOfWeek, HEBREW_DAYS_LONG, HEBREW_MONTHS } from '@/lib/date-utils'

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * The day columns the grid should render. `1` is the phone's single-day view; `7` must stay
 * byte-identical to `weekDays` so the desktop path is provably unchanged.
 */
export function visibleDays(anchor: Date, dayCount: 1 | 7): Date[] {
  return dayCount === 1 ? [anchor] : weekDays(anchor)
}

export function formatDayTitle(anchor: Date): string {
  return `${HEBREW_DAYS_LONG[anchor.getDay()]}, ${anchor.getDate()} ${HEBREW_MONTHS[anchor.getMonth()]}`
}

export function formatWeekRange(anchor: Date): string {
  const days = weekDays(anchor)
  const start = days[0] ?? anchor
  const end = days[6] ?? anchor
  return `${start.getDate()} ${HEBREW_MONTHS[start.getMonth()]} – ${end.getDate()} ${HEBREW_MONTHS[end.getMonth()]}`
}
