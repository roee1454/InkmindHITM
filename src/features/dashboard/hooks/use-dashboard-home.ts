import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { listConversations } from '@/features/conversations/server/messages'
import { listPipeline } from '@/features/projects/server/pipeline'
import { getAppointments } from '@/features/calendar/server/appointments'
import { getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import type { ApiAppointment } from '@/features/calendar/types'
import { nextAppointment, projectsNeedingAttention, stageCounts, todaysAppointments, waitingConversations } from '../utils/home'

/**
 * The home screen reads the inbox's, the board's and the calendar's own queries (same keys, same
 * cache, same realtime refreshes) rather than a dashboard endpoint that counts its own way.
 */
export function useDashboardHome(now: Date) {
  const staff = useQuery<CurrentStaffInfo>({ queryKey: ['currentStaff'], queryFn: () => getCurrentStaffInfo() })
  const conversations = useQuery({ queryKey: queryKeys.conversations, queryFn: () => listConversations(), refetchInterval: 60_000 })
  const pipeline = useQuery({ queryKey: queryKeys.pipeline, queryFn: () => listPipeline(), staleTime: 30_000 })
  const appointments = useQuery<ApiAppointment[]>({ queryKey: queryKeys.appointments, queryFn: () => getAppointments(), staleTime: 5 * 60_000 })

  const viewer = staff.data ? { id: staff.data.id, isAdmin: staff.data.isAdmin } : null
  const allAppointments = appointments.data ?? []

  return {
    waiting: waitingConversations(conversations.data ?? []),
    projectNeeds: projectsNeedingAttention(pipeline.data?.projects ?? [], now),
    today: viewer ? todaysAppointments(allAppointments, viewer, now) : [],
    next: viewer ? nextAppointment(allAppointments, viewer, now) : null,
    stages: pipeline.data ? stageCounts(pipeline.data) : [],
    loading: {
      needs: conversations.isLoading || pipeline.isLoading,
      today: appointments.isLoading || staff.isLoading,
      stages: pipeline.isLoading,
    },
    error: conversations.error ?? pipeline.error ?? appointments.error ?? null,
  }
}
