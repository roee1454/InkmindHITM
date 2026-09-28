import { useQuery } from '@tanstack/react-query'
import { getStaffList } from '@/features/settings/server/staff'
import type { StaffMember } from '@/features/settings/server/staff'
import { getGoogleCalendarConnections } from '../server/appointments'
import type { ApiGoogleConnection } from '../types'

/** The artists a booking can go to, and which of them sync to Google Calendar. */
export function useStaffDirectory() {
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
  return { staff, googleConnections }
}
