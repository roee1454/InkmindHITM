import { phoneMatchesQuery } from '@/lib/phone'
import type { ApiAppointment, AppointmentStatus } from '../types'

export type StatusFilter = 'all' | AppointmentStatus

export interface AppointmentFilters {
  /** A staff id, or 'all'. */
  artistId: string
  status: StatusFilter
  /** Free text: customer name, phone, style, artist, notes, date, time, or the kind in Hebrew. */
  query: string
}

/** Matched against the query so searching "קעקוע" or "סקיצה" finds the right appointments. */
function kindText(appointment: ApiAppointment): string {
  return appointment.type === 'sketch' ? 'סקיצה ייעוץ' : 'קעקוע'
}

export function matchesQuery(appointment: ApiAppointment, query: string): boolean {
  if (!query) return true
  const haystack = [
    appointment.leadName,
    appointment.style,
    appointment.staffName,
    appointment.notes,
    appointment.date,
    appointment.timeSlot,
    kindText(appointment),
  ]
  return (
    haystack.some((value) => (value || '').toLowerCase().includes(query)) ||
    phoneMatchesQuery(appointment.leadPhone, query)
  )
}

/**
 * The calendar's one filtering path (track-b B6.8), pulled out of `CalendarPage` so it can be
 * tested: artist, then status, then free text. Newest first, matching the list view's order.
 */
export function filterAppointments(appointments: ApiAppointment[], filters: AppointmentFilters): ApiAppointment[] {
  const query = filters.query.trim().toLowerCase()
  return appointments
    .filter((a) => filters.artistId === 'all' || a.staffId === filters.artistId)
    .filter((a) => filters.status === 'all' || a.status === filters.status)
    .filter((a) => matchesQuery(a, query))
    .sort((a, b) => `${b.date}${b.timeSlot}`.localeCompare(`${a.date}${a.timeSlot}`))
}

/** How many appointments each status chip/option should report, over the artist-filtered set. */
export function countByStatus(appointments: ApiAppointment[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = {
    all: appointments.length,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    no_show: 0,
  }
  for (const appointment of appointments) counts[appointment.status] += 1
  return counts
}
