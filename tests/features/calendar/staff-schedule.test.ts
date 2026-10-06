import { describe, expect, it } from 'vitest'
import { staffScheduledOn } from '#/features/calendar/utils/staff-schedule'
import type { StaffMember } from '@/features/settings/server/staff'
import type { ApiAppointment } from '#/features/calendar/types'

const staffer = (id: string, name: string, days: number[]): StaffMember =>
  ({ id, name, workHours: days.map((dayOfWeek) => ({ dayOfWeek, startTime: '10:00', endTime: '18:00' })) }) as StaffMember

const appt = (staffId: string, date: string): ApiAppointment => ({ staffId, date }) as ApiAppointment

// Tuesday.
const tuesday = new Date(2026, 8, 29)

describe('staffScheduledOn', () => {
  it('includes staff whose working hours cover that day of week', () => {
    const staff = [staffer('a', 'עובד שלישי', [2]), staffer('b', 'עובד ראשון', [0])]
    expect(staffScheduledOn(staff, [], tuesday).map((s) => s.id)).toEqual(['a'])
  })

  it('adds a staff member with an appointment that day even outside their configured hours', () => {
    const staff = [staffer('a', 'לא עובד שלישי', [0])]
    const appointments = [appt('a', '2026-09-29')]
    expect(staffScheduledOn(staff, appointments, tuesday).map((s) => s.id)).toEqual(['a'])
  })

  it('ignores an appointment on a different date', () => {
    const staff = [staffer('a', 'לא עובד שלישי', [0])]
    const appointments = [appt('a', '2026-09-28')]
    expect(staffScheduledOn(staff, appointments, tuesday)).toEqual([])
  })

  it('never duplicates a staff member who is both scheduled and booked', () => {
    const staff = [staffer('a', 'עובד', [2])]
    const appointments = [appt('a', '2026-09-29'), appt('a', '2026-09-29')]
    expect(staffScheduledOn(staff, appointments, tuesday)).toHaveLength(1)
  })

  it('preserves the input staff order', () => {
    const staff = [staffer('b', 'ב', [2]), staffer('a', 'א', [2])]
    expect(staffScheduledOn(staff, [], tuesday).map((s) => s.id)).toEqual(['b', 'a'])
  })
})
