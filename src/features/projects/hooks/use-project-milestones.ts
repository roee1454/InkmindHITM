import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { queryKeys } from '@/lib/query-keys'
import { completeProject, markProjectLost, reopenProject } from '../server/projects'
import type { LostReason } from '../types'

export const pipelineQueryKey = ['pipeline'] as const

/** Lost / reopen / complete, refreshing every view that shows a project's stage. */
export function useProjectMilestones() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: pipelineQueryKey }),
      queryClient.invalidateQueries({ queryKey: ['project-finance'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments }),
      queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
    ])

  const markLost = useMutation({
    mutationFn: (input: { projectId: string; reason: LostReason; note?: string }) => markProjectLost({ data: input }),
    onSuccess: () => {
      toast('הפרויקט סומן כאבוד', 'הסיבה נשמרה ותופיע בניתוח הנשירה.', 'success')
      return refresh()
    },
  })

  const reopen = useMutation({
    mutationFn: (projectId: string) => reopenProject({ data: { projectId } }),
    onSuccess: () => {
      toast('הפרויקט נפתח מחדש', 'השלב חזר להיות לפי התורים של הפרויקט.', 'success')
      return refresh()
    },
    onError: (err) => toast('פתיחה מחדש נכשלה', err instanceof Error ? err.message : '', 'error'),
  })

  const complete = useMutation({
    mutationFn: (projectId: string) => completeProject({ data: { projectId } }),
    onSuccess: () => {
      toast('הפרויקט סומן כהושלם', '', 'success')
      return refresh()
    },
    onError: (err) => toast('סימון כהושלם נכשל', err instanceof Error ? err.message : '', 'error'),
  })

  return { markLost, reopen, complete }
}
