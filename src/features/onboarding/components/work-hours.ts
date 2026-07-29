import type { WorkHoursWindow } from '@/integrations/pocketbase/types'

export const DAY_LABELS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${String(hours).padStart(2, '0')}:${minutes}`
})

export function findWindow(windows: WorkHoursWindow[], dayOfWeek: number) {
  return windows.find((w) => w.day_of_week === dayOfWeek)
}
