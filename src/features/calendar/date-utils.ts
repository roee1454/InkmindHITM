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

import { addDays, startOfWeek, HEBREW_MONTHS } from '@/lib/date-utils'

export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatWeekRange(anchor: Date): string {
  const days = weekDays(anchor)
  const start = days[0] ?? anchor
  const end = days[6] ?? anchor
  return `${start.getDate()} ${HEBREW_MONTHS[start.getMonth()]} – ${end.getDate()} ${HEBREW_MONTHS[end.getMonth()]}`
}
