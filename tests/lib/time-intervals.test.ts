import { describe, expect, it } from 'vitest'
import {
  subtractInterval,
  calculateFreeIntervals,
  findFittingSlots,
  checkSlotAvailability,
  timeStringToMinutes,
  minutesToTimeString,
} from '@/lib/time-intervals'

describe('time-intervals engine', () => {
  it('converts time string to minutes and back', () => {
    expect(timeStringToMinutes('12:00')).toBe(720)
    expect(timeStringToMinutes('13:30')).toBe(810)
    expect(minutesToTimeString(720)).toBe('12:00')
    expect(minutesToTimeString(810)).toBe('13:30')
  })

  it('subtracts busy interval from available shift correctly (splitting in the middle)', () => {
    // Shift: 11:00 to 19:00 (660 to 1140)
    const shift = [{ start: 660, end: 1140 }]
    // Busy: 13:00 to 16:00 (780 to 960)
    const busy = { start: 780, end: 960 }

    const free = subtractInterval(shift, busy)
    expect(free).toEqual([
      { start: 660, end: 780 }, // 11:00 to 13:00 (120 mins)
      { start: 960, end: 1140 }, // 16:00 to 19:00 (180 mins)
    ])
  })

  it('handles multi-shift day (split shift) and multiple appointments', () => {
    // Shift: 10:00-14:00 (600-840) and 16:00-20:00 (960-1200)
    const shifts = [
      { start: 600, end: 840 },
      { start: 960, end: 1200 },
    ]
    // Busy 1: 11:00-12:00 (660-720)
    // Busy 2: 17:00-18:00 (1020-1080)
    const appointments = [
      { start: 660, end: 720 },
      { start: 1020, end: 1080 },
    ]

    const free = calculateFreeIntervals(shifts, appointments)
    expect(free).toEqual([
      { start: 600, end: 660 }, // 10:00-11:00 (60m)
      { start: 720, end: 840 }, // 12:00-14:00 (120m)
      { start: 960, end: 1020 }, // 16:00-17:00 (60m)
      { start: 1080, end: 1200 }, // 18:00-20:00 (120m)
    ])
  })

  it('accurately reproduces Roeis exact scenario (12:00 requested for 2-hour tattoo with 13:00 busy)', () => {
    // Shift: 10:00 to 20:00 (600 to 1200)
    const shifts = [{ start: 600, end: 1200 }]
    // Appointment at 13:00 to 16:00 (780 to 960)
    const busyAppointments = [{ start: 780, end: 960 }]

    const free = calculateFreeIntervals(shifts, busyAppointments)

    // Requested: 12:00 (720) for 120 minutes (until 14:00)
    const check12 = checkSlotAvailability(free, 720, 120)
    expect(check12.available).toBe(false)
    // It should report that only 60 minutes are free at 12:00 (until 13:00)!
    expect(check12.maxAvailableDurationMins).toBe(60)

    // A 1-hour session (60 mins) at 12:00 DOES fit:
    const check12Short = checkSlotAvailability(free, 720, 60)
    expect(check12Short.available).toBe(true)

    // A 2-hour session (120 mins) at 11:00 DOES fit:
    const check11 = checkSlotAvailability(free, 660, 120)
    expect(check11.available).toBe(true)

    // Available starting slots for 2 hours (120 mins):
    const slots = findFittingSlots(free, 120, 30)
    expect(slots).toContain('10:00')
    expect(slots).toContain('10:30')
    expect(slots).toContain('11:00')
    expect(slots).not.toContain('11:30') // 11:30+120=13:30 collides
    expect(slots).not.toContain('12:00') // 12:00+120=14:00 collides
    expect(slots).toContain('16:00')
  })
})
