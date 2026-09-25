/**
 * Core mathematical time-interval engine.
 *
 * Represents time within a 24-hour day as minutes from midnight (0..1440).
 * Completely pure, deterministic, and dependency-free.
 */

export interface TimeInterval {
  start: number // minutes from midnight (0..1440)
  end: number   // minutes from midnight (0..1440)
}

/**
 * Subtracts a single busy interval from a list of available free intervals.
 * Handles non-overlapping, partial overlap, trimming, and splitting.
 */
export function subtractInterval(available: TimeInterval[], busy: TimeInterval): TimeInterval[] {
  const result: TimeInterval[] = []

  for (const free of available) {
    // If no overlap: busy ends before free starts, or busy starts after free ends
    if (busy.end <= free.start || busy.start >= free.end) {
      result.push(free)
      continue
    }

    // Left chunk (before busy begins)
    if (busy.start > free.start) {
      result.push({ start: free.start, end: busy.start })
    }

    // Right chunk (after busy ends)
    if (busy.end < free.end) {
      result.push({ start: busy.end, end: free.end })
    }
  }

  return result
}

/**
 * Calculates remaining free intervals on a day given working shift windows and booked appointments.
 */
export function calculateFreeIntervals(
  workWindows: TimeInterval[],
  busyAppointments: TimeInterval[],
): TimeInterval[] {
  let free = [...workWindows]
  for (const busy of busyAppointments) {
    free = subtractInterval(free, busy)
  }
  return free
}

/**
 * Converts minutes from midnight to HH:MM formatted string.
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Converts HH:MM formatted string to minutes from midnight.
 */
export function timeStringToMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Finds all valid starting slot times (in HH:MM) where an appointment of durationMins fits.
 */
export function findFittingSlots(
  freeIntervals: TimeInterval[],
  durationMins: number,
  stepMins = 30,
): string[] {
  const slots: string[] = []

  for (const free of freeIntervals) {
    for (let m = free.start; m + durationMins <= free.end; m += stepMins) {
      slots.push(minutesToTimeString(m))
    }
  }

  return slots
}

/**
 * Checks if a specific requested slot [startMins, startMins + durationMins] fits within free intervals.
 * If not, returns the maximum available duration in minutes from that start time.
 */
export function checkSlotAvailability(
  freeIntervals: TimeInterval[],
  startMins: number,
  durationMins: number,
): { available: boolean; maxAvailableDurationMins: number } {
  const requestedEnd = startMins + durationMins

  for (const free of freeIntervals) {
    if (free.start <= startMins && free.end >= requestedEnd) {
      return { available: true, maxAvailableDurationMins: free.end - startMins }
    }
    if (free.start <= startMins && free.end > startMins) {
      return { available: false, maxAvailableDurationMins: free.end - startMins }
    }
  }

  return { available: false, maxAvailableDurationMins: 0 }
}
