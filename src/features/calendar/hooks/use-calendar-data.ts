import { useQuery } from '@tanstack/react-query'
import { getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import { getWorkingHours } from '@/features/settings/server/profiles'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { getAppointments } from '../server/appointments'
import type { ApiAppointment } from '../types'
import { useStaffDirectory } from './use-staff-directory'
import { artistAvatarMap } from '../utils/artist-avatars'

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

  const { staff, googleConnections } = useStaffDirectory()

  const workingHours = useQuery<WorkingHoursWindow[]>({
    queryKey: ['working-hours', selectedArtist],
    queryFn: () => getWorkingHours({ data: { staffId: selectedArtist } }),
    enabled: selectedArtist !== 'all',
  })

  const connections = googleConnections.data ?? []
  const staffList = staff.data ?? []
  const artistAvatars = artistAvatarMap(connections, staffList)

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
