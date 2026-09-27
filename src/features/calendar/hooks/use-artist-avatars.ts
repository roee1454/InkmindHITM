import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStaffList } from '@/features/settings/server/staff'
import { getGoogleCalendarConnections } from '../server/appointments'
import { artistAvatarMap } from '../utils/artist-avatars'

/** The artist pictures for screens outside the calendar; shares the calendar's query cache. */
export function useArtistAvatars(): Record<string, string> {
  const staff = useQuery({ queryKey: ['staff-list'], queryFn: () => getStaffList(), staleTime: 10 * 60 * 1000 })
  const connections = useQuery({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
    staleTime: 5 * 60 * 1000,
  })
  return useMemo(() => artistAvatarMap(connections.data ?? [], staff.data ?? []), [connections.data, staff.data])
}
