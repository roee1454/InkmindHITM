import { describe, expect, it, vi, beforeEach } from 'vitest'
import type PocketBase from 'pocketbase'
import {
  getAvailableSlotsForBot,
  checkAvailabilityForBot,
} from '@/features/calendar/server/bot-appointments.server'

import {
  getWorkingHoursForStaff,
} from '@/features/settings/server/profiles'
import { isStudioClosedOn } from '@/features/settings/server/closures'

// Mock dependencies
vi.mock('@/features/settings/server/profiles', () => ({
  getWorkingHoursForStaff: vi.fn(),
}))

vi.mock('@/features/settings/server/closures', () => ({
  isStudioClosedOn: vi.fn().mockResolvedValue({ closed: false }),
}))

function makeIso(year: number, month: number, day: number, hour: number, minute: number = 0) {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

describe('getAvailableSlotsForBot', () => {
  const staffId = 'staff_roee'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isStudioClosedOn).mockResolvedValue({ closed: false, reason: null })
  })

  it('calculates available slots accurately without proposing invalid or overlapping hours (live issue repro)', async () => {
    // Artist works Monday: 10:00 - 19:00
    // Monday is 2026-09-28 (2026-09-28 is a Monday)
    vi.mocked(getWorkingHoursForStaff).mockResolvedValue([
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
    ])

    // Existing appointment: Monday 13:00 - 15:00 (duration: 120 mins)
    const mockAppointments = [
      {
        id: 'apt_1',
        staff: staffId,
        start_time: makeIso(2026, 9, 28, 13, 0),
        duration_minutes: 120,
        status: 'confirmed',
      },
    ]

    const mockPb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'רואי חיילי' }),
          }
        }
        if (colName === 'appointments') {
          return {
            getFullList: vi.fn().mockResolvedValue(mockAppointments),
          }
        }
        return {
          getFullList: vi.fn().mockResolvedValue([]),
          getOne: vi.fn().mockResolvedValue({}),
        }
      }),
    } as unknown as PocketBase

    // Request: 2-hour tattoo appointment for Monday 2026-09-28
    const result = await getAvailableSlotsForBot(mockPb, {
      staffId,
      fromDate: '2026-09-28',
      days: 1,
      durationHours: 2,
    })

    expect(result.artistName).toBe('רואי חיילי')
    expect(result.availableDays).toHaveLength(1)

    const monday = result.availableDays[0]!
    expect(monday.date).toBe('2026-09-28')
    expect(monday.dayOfWeek).toBe('שני')

    // 10:00 to 12:00 -> fits!
    expect(monday.availableSlots).toContain('10:00')
    // 11:00 to 13:00 -> fits (ends exactly when the 13:00 apt starts)!
    expect(monday.availableSlots).toContain('11:00')
    // 15:00 to 17:00 -> fits (starts right after the 13:00-15:00 apt ends)!
    expect(monday.availableSlots).toContain('15:00')

    // CRITICAL: 12:00 CANNOT BE PROPOSED (12:00 to 14:00 collides with 13:00-15:00)
    expect(monday.availableSlots).not.toContain('12:00')
    // 13:00 CANNOT BE PROPOSED (already booked)
    expect(monday.availableSlots).not.toContain('13:00')
    // 14:00 CANNOT BE PROPOSED (already booked)
    expect(monday.availableSlots).not.toContain('14:00')
    // 18:00 CANNOT BE PROPOSED (18:00 + 2h = 20:00, exceeds 19:00 closing time)
    expect(monday.availableSlots).not.toContain('18:00')

    // Recommended slots provide well-spaced and prioritized proposals
    expect(monday.recommendedSlots).toContain('10:00')
    expect(monday.recommendedSlots).toContain('15:00')

    // Natural proposal sentence should be ready
    expect(result.readyToUseProposal).toContain('רואי חיילי')
    expect(result.readyToUseProposal).toContain('בשני (28.09)')
  })

  it('allows a 45-minute sketch meeting at 12:00 because it finishes before 13:00', async () => {
    vi.mocked(getWorkingHoursForStaff).mockResolvedValue([
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
    ])

    const mockAppointments = [
      {
        id: 'apt_1',
        staff: staffId,
        start_time: makeIso(2026, 9, 28, 13, 0),
        duration_minutes: 120,
        status: 'confirmed',
      },
    ]

    const mockPb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'רואי חיילי' }),
          }
        }
        if (colName === 'appointments') {
          return {
            getFullList: vi.fn().mockResolvedValue(mockAppointments),
          }
        }
        return {}
      }),
    } as unknown as PocketBase

    // 0.75 hours (45 min) sketch meeting
    const result = await getAvailableSlotsForBot(mockPb, {
      staffId,
      fromDate: '2026-09-28',
      days: 1,
      durationHours: 0.75,
    })

    const monday = result.availableDays[0]!
    // 12:00 to 12:45 fits before the 13:00 appointment!
    expect(monday.availableSlots).toContain('12:00')
    // But 13:00 is still taken
    expect(monday.availableSlots).not.toContain('13:00')
  })

  it('skips studio closure days', async () => {
    vi.mocked(isStudioClosedOn).mockResolvedValue({ closed: true, reason: 'יום כיפור' })
    vi.mocked(getWorkingHoursForStaff).mockResolvedValue([
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
    ])

    const mockPb = {
      collection: vi.fn(() => ({
        getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'רואי' }),
        getFullList: vi.fn().mockResolvedValue([]),
      })),
    } as unknown as PocketBase

    const result = await getAvailableSlotsForBot(mockPb, {
      staffId,
      fromDate: '2026-09-28',
      days: 1,
      durationHours: 2,
    })

    expect(result.availableDays).toHaveLength(0)
    expect(result.totalSlotsFound).toBe(0)
  })

  it('detects when the entire day is open and spaces recommendations across morning, afternoon, and evening', async () => {
    // Artist works Wednesday: 10:00 - 19:00
    // Wednesday 2026-10-07
    vi.mocked(getWorkingHoursForStaff).mockResolvedValue([
      { dayOfWeek: 3, startTime: '10:00', endTime: '19:00' },
    ])

    const mockPb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'דור חיילי' }),
          }
        }
        if (colName === 'appointments') {
          return {
            getFullList: vi.fn().mockResolvedValue([]), // No appointments at all!
          }
        }
        return {}
      }),
    } as unknown as PocketBase

    // 0.5 hour sketch meeting
    const result = await getAvailableSlotsForBot(mockPb, {
      staffId,
      fromDate: '2026-10-07',
      days: 1,
      durationHours: 0.5,
    })

    expect(result.availableDays).toHaveLength(1)
    const wednesday = result.availableDays[0]!
    expect(wednesday.isEntireDayFree).toBe(true)
    expect(wednesday.workingHoursRange).toBe('10:00-19:00')

    // It should NOT just recommend morning slots 10:00, 11:00, 12:00
    // It must cover morning and afternoon/evening
    expect(wednesday.recommendedSlots.length).toBe(3)
    expect(wednesday.recommendedSlots[0]).toBe('10:00') // Morning start
    // Middle slot should be around midday/afternoon (>= 12:30)
    const midSlotHour = Number(wednesday.recommendedSlots[1]!.split(':')[0])
    expect(midSlotHour).toBeGreaterThanOrEqual(12)
    // Third slot should be in afternoon/evening (>= 15:00)
    const lastSlotHour = Number(wednesday.recommendedSlots[2]!.split(':')[0])
    expect(lastSlotHour).toBeGreaterThanOrEqual(15)

    // Summary and proposal explicitly indicate that the entire day is open
    expect(wednesday.summaryHebrew).toContain('פנוי לאורך כל היום')
    expect(wednesday.summaryHebrew).toContain('10:00-19:00')
    expect(result.readyToUseProposal).toContain('פנוי לאורך כל שעות היום')
  })
})

describe('checkAvailabilityForBot with alternatives', () => {
  const staffId = 'staff_roee'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isStudioClosedOn).mockResolvedValue({ closed: false, reason: null })
  })

  it('returns alternative slots when the requested slot collides with an existing appointment', async () => {
    vi.mocked(getWorkingHoursForStaff).mockResolvedValue([
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00' },
    ])

    const mockAppointments = [
      {
        id: 'apt_1',
        staff: staffId,
        start_time: makeIso(2026, 9, 28, 13, 0),
        duration_minutes: 120,
        status: 'confirmed',
      },
    ]

    const mockPb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'רואי חיילי' }),
          }
        }
        if (colName === 'appointments') {
          return {
            getFullList: vi.fn().mockResolvedValue(mockAppointments),
            getFirstListItem: vi.fn().mockRejectedValue(new Error('not found')),
          }
        }
        return {}
      }),
    } as unknown as PocketBase

    // Client requests 12:00 for a 2-hour tattoo on 2026-09-28
    const checkResult = await checkAvailabilityForBot(mockPb, {
      staffId,
      date: '2026-09-28',
      timeSlot: '12:00',
      durationHours: 2,
    })

    expect(checkResult.available).toBe(false)
    expect(checkResult.reason).toBe('slot_taken')
    // Alternative slots on that day should be returned
    expect(checkResult.alternativeSlots).toBeDefined()
    expect(checkResult.alternativeSlots).toContain('10:00')
    expect(checkResult.alternativeSlots).toContain('11:00')
    expect(checkResult.alternativeSlots).toContain('15:00')
    expect(checkResult.alternativeSlots).not.toContain('12:00')
    expect(checkResult.alternativeSlots).not.toContain('13:00')
  })

  it('allows booking when allowException is true even if the slot collides with an existing appointment', async () => {
    const mockPb = {
      collection: vi.fn((colName: string) => {
        if (colName === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: staffId, name: 'רואי חיילי' }),
          }
        }
        return {}
      }),
    } as unknown as PocketBase

    const checkResult = await checkAvailabilityForBot(mockPb, {
      staffId,
      date: '2026-09-28',
      timeSlot: '12:00',
      durationHours: 2,
      allowException: true,
    })

    expect(checkResult.available).toBe(true)
    expect(checkResult.isException).toBe(true)
    expect(checkResult.reason).toBe('available')
  })
})

