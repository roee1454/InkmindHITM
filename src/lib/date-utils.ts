// Hand-rolled date helpers shared across features (calendar grids, date/hour picker primitives).
// Ported from WAHA/apps/ui/src/lib/date-utils.ts — no date library, local-timezone day math only.
//
// The one rule that matters: never round-trip a calendar day through toISOString(), which converts
// to UTC and can land on the previous day for anyone east of Greenwich (Asia/Jerusalem always is).
// toYmd() reads the local fields directly instead.

export const HEBREW_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']
export const HEBREW_DAYS_LONG = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת']

export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]

export function toYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function fromYmd(ymd: string): Date {
  const [year = 0, month = 1, day = 1] = ymd.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// Clamps the day first, so "Jan 31 + 1 month" is Feb 28/29 rather than overflowing into March.
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(date.getDate(), lastDay))
  return next
}

// Weeks run Sunday–Saturday (getDay() is already 0 = Sunday), matching the reference's א׳…שבת header.
export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay())
}

// 6 rows × 7 days, always — a fixed height keeps the grid from reflowing as you page through months.
// Leading/trailing days belong to the neighbouring months and are rendered dimmed.
export function buildMonthMatrix(anchor: Date): Date[][] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = startOfWeek(firstOfMonth)
  return Array.from({ length: 6 }, (_week, week) =>
    Array.from({ length: 7 }, (_day, day) => addDays(gridStart, week * 7 + day)),
  )
}

export function isSameDay(a: Date, b: Date): boolean {
  return toYmd(a) === toYmd(b)
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function isSameMonth(date: Date, anchor: Date): boolean {
  return date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear()
}

export function formatMonthTitle(anchor: Date): string {
  return `${HEBREW_MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
}

export function timeToMinutes(timeSlot: string): number {
  const [hour, minute] = timeSlot.split(':').map(Number)
  return (hour || 0) * 60 + (minute || 0)
}

export function minutesToTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
