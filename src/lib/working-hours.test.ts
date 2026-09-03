import { describe, it, expect } from 'vitest'
import { evaluateWorkingHoursTier, type WorkingHoursWindow } from './working-hours'

describe('evaluateWorkingHoursTier', () => {
  // Sunday (dayOfWeek = 0), working hours 11:00 to 19:00
  const windows: WorkingHoursWindow[] = [
    { dayOfWeek: 0, startTime: '11:00', endTime: '19:00' },
  ]
  // 2026-09-06 is a Sunday
  const sunday = '2026-09-06'

  it('identifies standard in-window slots as Tier 1', () => {
    // 14:00 to 16:00 (2 hours) -> inside 11:00-19:00
    const res = evaluateWorkingHoursTier(windows, sunday, '14:00', 2)
    expect(res.fits).toBe(true)
    expect(res.tier).toBe(1)
    expect(res.overtimeMinutes).toBe(0)
  })

  it('identifies slot that ends at exact closing time as Tier 1', () => {
    // 18:00 to 19:00 (1 hour)
    const res = evaluateWorkingHoursTier(windows, sunday, '18:00', 1)
    expect(res.fits).toBe(true)
    expect(res.tier).toBe(1)
    expect(res.overtimeMinutes).toBe(0)
  })

  it('identifies short slot extending past closing within Tier 2 flexibility (e.g. 19:00 to 19:45 for sketch)', () => {
    // 19:00 to 19:45 (0.75 hours = 45 mins), closing is 19:00
    // default flexibility: allowTier2 = true, tier2ExtensionMinutes = 90, tier2MaxSessionMinutes = 60
    const res = evaluateWorkingHoursTier(windows, sunday, '19:00', 0.75)
    expect(res.fits).toBe(true)
    expect(res.tier).toBe(2)
    expect(res.overtimeMinutes).toBe(45)
    expect(res.standardEndTime).toBe('19:00')
  })

  it('identifies slot starting before closing and ending in Tier 2 (e.g. 18:30 to 19:30)', () => {
    // 18:30 to 19:30 (1 hour = 60 mins), closing is 19:00
    // overtime = 30 mins (<= 90), duration = 60 mins (<= 60)
    const res = evaluateWorkingHoursTier(windows, sunday, '18:30', 1)
    expect(res.fits).toBe(true)
    expect(res.tier).toBe(2)
    expect(res.overtimeMinutes).toBe(30)
  })

  it('rejects slot as Tier 3 if session duration exceeds tier2MaxSessionMinutes', () => {
    // 18:30 to 20:00 (1.5 hours = 90 mins > 60 mins max session)
    const res = evaluateWorkingHoursTier(windows, sunday, '18:30', 1.5)
    expect(res.fits).toBe(false)
    expect(res.tier).toBe(3)
  })

  it('rejects slot as Tier 3 if extension exceeds tier2ExtensionMinutes', () => {
    // 19:30 to 20:45 (1 hour 15 mins), ends at 20:45 (overtime = 105 mins > 90 mins max extension)
    const res = evaluateWorkingHoursTier(windows, sunday, '19:30', 1.25)
    expect(res.fits).toBe(false)
    expect(res.tier).toBe(3)
  })

  it('rejects slot as Tier 3 if allowTier2 is disabled for this artist', () => {
    const res = evaluateWorkingHoursTier(windows, sunday, '19:00', 0.5, {
      allowTier2: false,
      tier2ExtensionMinutes: 90,
      tier2MaxSessionMinutes: 60,
    })
    expect(res.fits).toBe(false)
    expect(res.tier).toBe(3)
  })

  it('rejects slot on closed days as Tier 3', () => {
    // 2026-09-07 is Monday (dayOfWeek = 1), not in windows
    const monday = '2026-09-07'
    const res = evaluateWorkingHoursTier(windows, monday, '14:00', 2)
    expect(res.fits).toBe(false)
    expect(res.tier).toBe(3)
  })
})

