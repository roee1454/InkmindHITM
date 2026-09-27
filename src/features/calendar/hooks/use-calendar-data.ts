import { useQuery } from '@tanstack/react-query'
import { getCurrentStaffInfo, getStaffList } from '@/features/settings/server/staff'
import type { CurrentStaffInfo, StaffMember } from '@/features/settings/server/staff'
import { getWorkingHours } from '@/features/settings/server/profiles'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { getAppointments, getGoogleCalendarConnections } from '../server/appointments'
import type { ApiAppointment, ApiGoogleConnection } from '../types'

/**
 * Everything the calendar screen reads (track-b B6.8). Pulled out of `CalendarPage` so the page
 * is composition only: five queries plus the artist→avatar map they feed.
 */
export function useCalendarData(selectedArtist: string) {
  const currentStaff = useQuery<CurrentStaffInfo>({
    queryKey: ['currentStaff'],
    queryFn: () => getCurrentStaffInfo(),
  })

  const appointments = useQuery<ApiAppointment[]>({
    queryKey: ['appointments'],
    queryFn: () => getAppointments(),
    staleTime: 5 * 60 * 1000,
  })

  const staff = useQuery<StaffMember[]>({
    queryKey: ['staff-list'],
    queryFn: () => getStaffList(),
    staleTime: 10 * 60 * 1000,
  })

  const googleConnections = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
    staleTime: 5 * 60 * 1000,
  })

  const workingHours = useQuery<WorkingHoursWindow[]>({
    queryKey: ['working-hours', selectedArtist],
    queryFn: () => getWorkingHours({ data: { staffId: selectedArtist } }),
    enabled: selectedArtist !== 'all',
  })

  const connections = googleConnections.data ?? []
  const staffList = staff.data ?? []
  const artistAvatars: Record<string, string> = {}
  for (const connection of connections) {
    if (connection.status === 'connected' && connection.googleAccountPicture) {
      artistAvatars[connection.staffId] = connection.googleAccountPicture
    }
  }
  for (const member of staffList) {
    if (member.avatar && !artistAvatars[member.id]) artistAvatars[member.id] = member.avatar
  }

  return {
    currentStaff: currentStaff.data,
    appointments: appointments.data ?? [],
    staff: staffList,
    googleConnections: connections,
    // Working hours are per-artist, so "all artists" has no single range to draw.
    workingHours: selectedArtist === 'all' ? null : workingHours.data ?? null,
    artistAvatars,
    isLoading: appointments.isLoading || staff.isLoading,
    error: appointments.error?.message || staff.error?.message || null,
  }
}
