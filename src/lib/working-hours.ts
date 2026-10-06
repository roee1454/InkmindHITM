import { timeStringToMinutes } from './time-intervals'

export interface WorkingHoursWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

/** A working-hours window is valid only when its start is strictly before its end. */
export function isValidTimeRange(window: Pick<WorkingHoursWindow, 'startTime' | 'endTime'>): boolean {
  if (!window.startTime || !window.endTime) return true
  return timeStringToMinutes(window.startTime) < timeStringToMinutes(window.endTime)
}

/**
 * Checks whether an appointment of durationHours starting at timeSlot fits within any of the staff's
 * configured working windows for that day of the week.
 *
 * Supports single shifts, split shifts, and multi-window schedules seamlessly.
 */
export function fitsWithinWorkingHours(
  windows: WorkingHoursWindow[],
  date: string,
  timeSlot: string,
  durationHours: number,
): boolean {
  if (!date || !timeSlot || windows.length === 0) return true
  const [year = 2026, month = 1, day = 1] = date.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()

  const slotStartMins = timeStringToMinutes(timeSlot)
  const slotEndMins = slotStartMins + Math.round(durationHours * 60)

  // Fits if entirely contained within at least one working window for that day
  return windows.some((w) => {
    if (w.dayOfWeek !== dayOfWeek) return false
    const winStart = timeStringToMinutes(w.startTime)
    const winEnd = timeStringToMinutes(w.endTime)
    return slotStartMins >= winStart && slotEndMins <= winEnd
  })
}
