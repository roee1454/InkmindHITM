import { describe, expect, it } from 'vitest'
import { fitsWithinWorkingHours  } from '@/lib/working-hours'
import type {WorkingHoursWindow} from '@/lib/working-hours';

describe('fitsWithinWorkingHours', () => {
  const sunday = '2026-09-27' // Sunday (dayOfWeek = 0)
  const monday = '2026-09-28' // Monday (dayOfWeek = 1)

  const windows: WorkingHoursWindow[] = [
    { dayOfWeek: 0, startTime: '11:00', endTime: '19:00' },
    // Split shift on Monday: 10:00-14:00 and 16:00-20:00
    { dayOfWeek: 1, startTime: '10:00', endTime: '14:00' },
    { dayOfWeek: 1, startTime: '16:00', endTime: '20:00' },
  ]

  it('returns true for a slot fully within standard hours', () => {
    // Sunday 14:00 for 2 hours (14:00 - 16:00)
    expect(fitsWithinWorkingHours(windows, sunday, '14:00', 2)).toBe(true)
  })

  it('returns true when ending exactly at shift end', () => {
    // Sunday 17:00 for 2 hours (17:00 - 19:00)
    expect(fitsWithinWorkingHours(windows, sunday, '17:00', 2)).toBe(true)
  })

  it('returns false when slot extends beyond shift end', () => {
    // Sunday 18:00 for 2 hours (18:00 - 20:00 -> exceeds 19:00)
    expect(fitsWithinWorkingHours(windows, sunday, '18:00', 2)).toBe(false)
  })

  it('returns false when slot starts before shift start', () => {
    // Sunday 10:00 for 2 hours (starts before 11:00)
    expect(fitsWithinWorkingHours(windows, sunday, '10:00', 2)).toBe(false)
  })

  it('supports split shifts seamlessly', () => {
    // Monday morning shift: 10:00 - 12:00 (fits in 10:00-14:00)
    expect(fitsWithinWorkingHours(windows, monday, '10:00', 2)).toBe(true)
    // Monday morning shift: 12:00 - 14:00 (fits in 10:00-14:00)
    expect(fitsWithinWorkingHours(windows, monday, '12:00', 2)).toBe(true)

    // Monday break gap: 13:00 - 15:00 (collides with 14:00 break)
    expect(fitsWithinWorkingHours(windows, monday, '13:00', 2)).toBe(false)
    expect(fitsWithinWorkingHours(windows, monday, '14:00', 1)).toBe(false)

    // Monday evening shift: 16:00 - 18:00 (fits in 16:00-20:00)
    expect(fitsWithinWorkingHours(windows, monday, '16:00', 2)).toBe(true)
    expect(fitsWithinWorkingHours(windows, monday, '18:00', 2)).toBe(true)
  })
})
