import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { queryKeys } from '@/lib/query-keys'
import { getProjectDetails, moveAppointmentToProject, updateProjectDetails } from '../server/projects'
import { pipelineQueryKey } from './use-project-milestones'

export function projectDetailsQueryKey(projectId: string | null) {
  return ['project-details', projectId] as const
}

/** The project panel's data, and the edits it makes. */
export function useProjectDetails(projectId: string | null) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

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
    ])

  const update = useMutation({
    mutationFn: (input: { title: string; quoteMin: number | null; quoteMax: number | null; estimatedSessions: number | null }) =>
      updateProjectDetails({ data: { projectId: projectId ?? '', ...input } }),
    onSuccess: () => {
      toast('הפרויקט עודכן', '', 'success')
      return refresh()
    },
  })

  const move = useMutation({
    mutationFn: (input: { appointmentId: string; target: string }) => moveAppointmentToProject({ data: input }),
    onSuccess: () => {
      toast('התור הועבר', 'השלבים של שני הפרויקטים חושבו מחדש.', 'success')
      return refresh()
    },
  })

  return { details, update, move }
}
