export interface WorkingHoursWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

function isAtOrBefore(a: string, b: string): boolean {
  return a <= b
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

export function fitsWithinWorkingHours(
  windows: WorkingHoursWindow[],
  date: string,
  timeSlot: string,
  durationHours: number,
): boolean {
  if (!date || !timeSlot) return true
  const [year = 2026, month = 1, day = 1] = date.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()

  return windows.some(
    (w) =>
      w.dayOfWeek === dayOfWeek &&
      isAtOrBefore(w.startTime, timeSlot) &&
      isAtOrBefore(addMinutes(timeSlot, durationHours * 60), w.endTime),
  )
}
