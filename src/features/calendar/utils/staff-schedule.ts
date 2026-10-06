import type { StaffMember } from '@/features/settings/server/staff'
import type { ApiAppointment } from '../types'
import { toYmd } from './date-utils'

/**
 * Who gets a column in the day's resource view (track-b B6.8): staff scheduled to work that day,
 * plus anyone with an appointment on it even outside their configured hours — a manual exception
 * never ends up in a column that isn't there. Every appointment has an artist (the product doesn't
 * allow booking without one), so there is no "unassigned" column to design for.
 *
 * Order follows the input `staff` array (already sorted by name).
 */
export function staffScheduledOn(staff: StaffMember[], appointments: ApiAppointment[], date: Date): StaffMember[] {
  const dayOfWeek = date.getDay()
  const ymd = toYmd(date)
  const scheduled = new Set(staff.filter((s) => s.workHours.some((w) => w.dayOfWeek === dayOfWeek)).map((s) => s.id))
  const booked = new Set(appointments.filter((a) => a.date === ymd && a.staffId).map((a) => a.staffId as string))
  return staff.filter((s) => scheduled.has(s.id) || booked.has(s.id))
}
