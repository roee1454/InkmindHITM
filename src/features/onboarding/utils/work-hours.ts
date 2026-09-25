import type { WorkingHoursWindow } from '@/features/settings/server/profiles'

/** Sun–Thu 10:00–18:00 — the confirm-the-default answer on onboarding's hours step, and the
 *  three quick presets. Single source of truth so the confirm screen and the detail editor
 *  never drift. */
export const DEFAULT_HOURS_PRESET: WorkingHoursWindow[] = [0, 1, 2, 3, 4].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '10:00',
  endTime: '18:00',
}))

export const HOURS_PRESETS = {
  morning: { label: 'בוקר 09–17', startTime: '09:00', endTime: '17:00' },
  standard: { label: 'סטנדרט 10–18', startTime: '10:00', endTime: '18:00' },
  evening: { label: 'ערב 12–20', startTime: '12:00', endTime: '20:00' },
} as const
