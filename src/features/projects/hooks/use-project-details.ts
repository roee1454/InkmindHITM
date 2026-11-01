import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIMToast } from '@/components/ui/toast'
import { queryKeys } from '@/lib/query-keys'
import { createAppointment } from '@/features/calendar/server/appointments'
import { toCreateAppointmentInput } from '@/features/calendar/utils/appointment-payload'
import type { AppointmentFormValues } from '@/features/calendar/types'
import { getProjectDetails, moveAppointmentToProject, updateProjectDetails } from '../server/projects'
import { pipelineQueryKey } from './use-project-milestones'

export function projectDetailsQueryKey(projectId: string | null) {
  return ['project-details', projectId] as const
}

/** The project panel's data, and the edits it makes: details, moving, attaching and booking appointments. */
export function useProjectDetails(projectId: string | null) {
  const queryClient = useQueryClient()
  const { show: toast } = useIMToast()

  const details = useQuery({
    queryKey: projectDetailsQueryKey(projectId),
    queryFn: () => getProjectDetails({ data: { projectId: projectId ?? '' } }),
    enabled: Boolean(projectId),
    staleTime: 0,
  })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['project-details'] }),
      queryClient.invalidateQueries({ queryKey: pipelineQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['project-finance'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments }),
      // An open customer card lists this project too (customer-overview, keyed under customers).
      queryClient.invalidateQueries({ queryKey: [...queryKeys.customers, 'overview'] }),
      // The booking wizard's project picker shows stages, which a booking or a move changes.
      queryClient.invalidateQueries({ queryKey: ['open-projects'] }),
    ])

  const update = useMutation({
    mutationFn: (input: { title: string; quoteMin: number | null; quoteMax: number | null; estimatedSessions: number | null }) =>
      updateProjectDetails({ data: { projectId: projectId ?? '', ...input } }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'הפרויקט עודכן' })
      return refresh()
    },
  })

  const move = useMutation({
    mutationFn: (input: { appointmentId: string; target: string }) => moveAppointmentToProject({ data: input }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'התור הועבר', description: 'השלבים של שני הפרויקטים חושבו מחדש.' })
      return refresh()
    },
  })

  // Filing one of the customer's appointments from another project under this one.
  const attach = useMutation({
    mutationFn: (appointmentId: string) => moveAppointmentToProject({ data: { appointmentId, target: projectId ?? '' } }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'התור שויך לפרויקט', description: 'השלבים של שני הפרויקטים חושבו מחדש.' })
      return refresh()
    },
  })

  const book = useMutation({
    mutationFn: (values: AppointmentFormValues) => createAppointment({ data: toCreateAppointmentInput(values) }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'התור נקבע', description: 'הוא מופיע ביומן ובפרויקט.' })
      return refresh()
    },
  })

  return { details, update, move, attach, book }
}
