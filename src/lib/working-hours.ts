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

export interface WorkingHoursEvaluation {
  fits: boolean
  tier: 1 | 2 | 3
  standardEndTime?: string
  overtimeMinutes?: number
}

export function evaluateWorkingHoursTier(
  windows: WorkingHoursWindow[],
  date: string,
  timeSlot: string,
  durationHours: number,
  flexibility: {
    allowTier2?: boolean
    tier2ExtensionMinutes?: number
    tier2MaxSessionMinutes?: number
  } = { allowTier2: true, tier2ExtensionMinutes: 90, tier2MaxSessionMinutes: 60 },
): WorkingHoursEvaluation {
  if (!date || !timeSlot) return { fits: true, tier: 1 }
  const [year = 2026, month = 1, day = 1] = date.split('-').map(Number)
  const dayOfWeek = new Date(year, month - 1, day).getDay()

  const window = windows.find((w) => w.dayOfWeek === dayOfWeek)
  if (!window) {
    return { fits: false, tier: 3 }
  }

  const [startH = 0, startM = 0] = timeSlot.split(':').map(Number)
  const slotStartMins = startH * 60 + startM
  const durationMins = Math.round(durationHours * 60)
  const slotEndMins = slotStartMins + durationMins

  const [winStartH = 0, winStartM = 0] = window.startTime.split(':').map(Number)
  const winStartMins = winStartH * 60 + winStartM

  const [winEndH = 0, winEndM = 0] = window.endTime.split(':').map(Number)
  const winEndMins = winEndH * 60 + winEndM

  // If starts before window start
  if (slotStartMins < winStartMins) {
    return { fits: false, tier: 3, standardEndTime: window.endTime }
  }

  // Tier 1: Ends at or before standard end time
  if (slotEndMins <= winEndMins) {
    return { fits: true, tier: 1, standardEndTime: window.endTime, overtimeMinutes: 0 }
  }

  // Tier 2 check
  const overtimeMins = slotEndMins - winEndMins
  const allowTier2 = flexibility.allowTier2 ?? true
  const maxExtension = flexibility.tier2ExtensionMinutes ?? 90
  const maxSession = flexibility.tier2MaxSessionMinutes ?? 60

  if (allowTier2 && overtimeMins <= maxExtension && durationMins <= maxSession) {
    return { fits: true, tier: 2, standardEndTime: window.endTime, overtimeMinutes: overtimeMins }
  }

  // Otherwise Tier 3
  return { fits: false, tier: 3, standardEndTime: window.endTime, overtimeMinutes: overtimeMins }
}
