import { describe, expect, it } from 'vitest'
import { calendarTitle } from '#/features/calendar/utils/date-utils'
import { FALLBACK_HOUR_RANGE, gridHourRange, hoursIn } from '#/features/calendar/utils/grid-hours'
import { countByStatus, filterAppointments, matchesQuery } from '#/features/calendar/utils/filter-appointments'
import { effectiveViewMode, isGridMode } from '#/features/calendar/utils/view-mode'
import type { ApiAppointment } from '#/features/calendar/types'
import type { WorkingHoursWindow } from '@/lib/working-hours'

const appointment = (overrides: Partial<ApiAppointment> = {}): ApiAppointment =>
  ({
    id: 'a1',
    date: '2026-10-01',
    timeSlot: '10:00',
    status: 'confirmed',
    staffId: 'st1',
    staffName: 'דנה',
    leadName: 'יוסי',
    leadPhone: '+972521234567',
    style: 'דרקון',
    notes: null,
    durationMinutes: 120,
    type: 'tattoo',
    ...overrides,
  }) as ApiAppointment

const window = (dayOfWeek: number, startTime: string, endTime: string): WorkingHoursWindow => ({ dayOfWeek, startTime, endTime })

describe('view mode (track-b B6.8)', () => {
  it('collapses the week and month grids to a single day on a phone, and leaves the list alone', () => {
    expect(effectiveViewMode('week', true)).toBe('day')
    expect(effectiveViewMode('month', true)).toBe('day')
    expect(effectiveViewMode('list', true)).toBe('list')
    expect(effectiveViewMode('week', false)).toBe('week')
  })

  it('knows which modes draw a time grid', () => {
    expect(isGridMode('week')).toBe(true)
    expect(isGridMode('list')).toBe(false)
  })

  it('titles the screen by its range', () => {
    const anchor = new Date(2026, 9, 1)
    expect(calendarTitle('list', anchor)).toBe('כל התורים')
    expect(calendarTitle('month', anchor)).toContain('אוקטובר')
    expect(calendarTitle('day', anchor)).toContain('1')
  })
})

describe('grid hour range (track-b B6.8)', () => {
  it('falls back to 8–20 with no working hours configured', () => {
    expect(gridHourRange(null)).toEqual(FALLBACK_HOUR_RANGE)
    expect(gridHourRange([])).toEqual(FALLBACK_HOUR_RANGE)
  })

  it('spans the earliest start and latest end across every window', () => {
    expect(gridHourRange([window(0, '11:00', '19:00'), window(2, '09:30', '21:00')])).toEqual({ startHour: 9, endHour: 20 })
  })

  it('does not draw an empty row for a day that ends exactly on the hour', () => {
    expect(gridHourRange([window(1, '10:00', '18:00')])).toEqual({ startHour: 10, endHour: 17 })
    expect(hoursIn(gridHourRange([window(1, '10:00', '18:00')]))).toEqual([10, 11, 12, 13, 14, 15, 16, 17])
  })

  it('pads a very short day so the grid still reads as a day', () => {
    const range = gridHourRange([window(1, '12:00', '14:00')])
    expect(range.endHour - range.startHour + 1).toBeGreaterThanOrEqual(6)
    expect(range.startHour).toBe(12)
  })

  it('ignores an invalid window instead of inverting the grid', () => {
    expect(gridHourRange([window(1, '20:00', '08:00')])).toEqual(FALLBACK_HOUR_RANGE)
  })
})

describe('appointment filtering (track-b B6.8)', () => {
  const all = [
    appointment({ id: 'a', status: 'confirmed', staffId: 'st1', leadName: 'יוסי' }),
    appointment({ id: 'b', status: 'pending', staffId: 'st2', leadName: 'מיכל', date: '2026-10-02' }),
    appointment({ id: 'c', status: 'cancelled', staffId: 'st1', leadName: 'אבי', date: '2026-10-03' }),
  ]

  it('narrows by artist, then status, then text', () => {
    expect(filterAppointments(all, { artistId: 'st1', status: 'all', query: '' }).map((a) => a.id)).toEqual(['c', 'a'])
    expect(filterAppointments(all, { artistId: 'all', status: 'pending', query: '' }).map((a) => a.id)).toEqual(['b'])
    expect(filterAppointments(all, { artistId: 'all', status: 'all', query: 'מיכל' }).map((a) => a.id)).toEqual(['b'])
  })

  it('sorts newest first, matching the list view', () => {
    expect(filterAppointments(all, { artistId: 'all', status: 'all', query: '' }).map((a) => a.id)).toEqual(['c', 'b', 'a'])
  })

  it('searches phone, artist and the kind in Hebrew, not just the name', () => {
    expect(matchesQuery(appointment(), '0521234567')).toBe(true)
    expect(matchesQuery(appointment(), 'דנה')).toBe(true)
    expect(matchesQuery(appointment({ type: 'sketch' }), 'סקיצה')).toBe(true)
    expect(matchesQuery(appointment(), 'סקיצה')).toBe(false)
  })

  it('counts every status for the filter options', () => {
    expect(countByStatus(all)).toEqual({ all: 3, confirmed: 1, pending: 1, cancelled: 1, completed: 0, no_show: 0 })
  })
})

describe('calendar default artist filter based on staff role', () => {
  it('defaults to "all" when staff member is an admin or owner', () => {
    const adminStaff = { id: 'admin_1', isAdmin: true, name: 'Admin', role: 'admin' }
    const defaultArtist = adminStaff.isAdmin ? 'all' : adminStaff.id
    expect(defaultArtist).toBe('all')
  })

  it('defaults to personal staffId when staff member is not an admin', () => {
    const regularStaff = { id: 'artist_1', isAdmin: false, name: 'Artist', role: 'staff' }
    const defaultArtist = regularStaff.isAdmin ? 'all' : regularStaff.id
    expect(defaultArtist).toBe('artist_1')
  })

  it('shows all appointments across all staff when selectedArtist is "all"', () => {
    const appointments = [
      appointment({ id: 'a', staffId: 'artist_1' }),
      appointment({ id: 'b', staffId: 'artist_2' }),
      appointment({ id: 'c', staffId: 'admin_1' }),
    ]
    const visible = filterAppointments(appointments, { artistId: 'all', status: 'all', query: '' })
    expect(visible).toHaveLength(3)
    expect(visible.map((a) => a.id)).toEqual(['a', 'b', 'c'])
  })
})
