import { timeStringToMinutes } from '@/lib/time-intervals'
import type { WorkingHoursWindow } from '@/lib/working-hours'

export interface GridHourRange {
  /** First hour row, inclusive. */
  startHour: number
  /** Last hour row, inclusive. */
  endHour: number
}

/** What the grid showed before working hours drove it, and what it falls back to. */
export const FALLBACK_HOUR_RANGE: GridHourRange = { startHour: 8, endHour: 20 }

/** Fewer rows than this and the grid reads as a stub rather than a day. */
const MIN_SPAN_HOURS = 6

/**
 * The hour rows the time grid draws (track-b B6.8), derived from the staff's working hours
 * instead of a hardcoded 8–20: a studio that opens at noon shouldn't stare at four empty
 * morning rows. Computed across every window, not per visible day, so the range doesn't jump
 * as you page through weeks.
 */
export function gridHourRange(windows: WorkingHoursWindow[] | null | undefined): GridHourRange {
  if (!windows || windows.length === 0) return FALLBACK_HOUR_RANGE

  let earliest = Number.POSITIVE_INFINITY
  let latest = Number.NEGATIVE_INFINITY
  for (const window of windows) {
    if (!window.startTime || !window.endTime) continue
    earliest = Math.min(earliest, timeStringToMinutes(window.startTime))
    latest = Math.max(latest, timeStringToMinutes(window.endTime))
  }
  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest <= earliest) return FALLBACK_HOUR_RANGE

  const startHour = Math.max(0, Math.floor(earliest / 60))
  // An appointment ending at 20:30 needs the 20:00 row; one ending exactly at 20:00 does not.
  const lastMinute = latest % 60 === 0 ? latest - 60 : latest
  const endHour = Math.min(23, Math.floor(lastMinute / 60))

  if (endHour - startHour + 1 < MIN_SPAN_HOURS) {
    const padded = Math.min(23, startHour + MIN_SPAN_HOURS - 1)
    // Padding forward hit midnight: pull the start back instead so the span still holds.
    return padded - startHour + 1 < MIN_SPAN_HOURS
      ? { startHour: Math.max(0, 23 - MIN_SPAN_HOURS + 1), endHour: 23 }
      : { startHour, endHour: padded }
  }
  return { startHour, endHour }
}

/** The hour rows themselves, for the gutter and the grid body. */
export function hoursIn(range: GridHourRange): number[] {
  return Array.from({ length: range.endHour - range.startHour + 1 }, (_, i) => range.startHour + i)
}
