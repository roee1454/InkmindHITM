import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useIMToast } from '@/components/ui/toast'
import { queryKeys } from '@/lib/query-keys'
import { completeProject, markProjectLost, reopenProject } from '../server/projects'
import type { LostReason } from '../types'

export const pipelineQueryKey = queryKeys.pipeline

/** Lost / reopen / complete, refreshing every view that shows a project's stage. */
export function useProjectMilestones() {
  const queryClient = useQueryClient()
  const { show: toast } = useIMToast()

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
      toast({ tone: 'success', title: 'הפרויקט סומן כאבוד', description: 'הסיבה נשמרה ותופיע בניתוח הנשירה.' })
      return refresh()
    },
  })

  const reopen = useMutation({
    mutationFn: (projectId: string) => reopenProject({ data: { projectId } }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'הפרויקט נפתח מחדש', description: 'השלב חזר להיות לפי התורים של הפרויקט.' })
      return refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'פתיחה מחדש נכשלה', description: err instanceof Error ? err.message : '' }),
  })

  const complete = useMutation({
    mutationFn: (projectId: string) => completeProject({ data: { projectId } }),
    onSuccess: () => {
      toast({ tone: 'success', title: 'הפרויקט סומן כהושלם' })
      return refresh()
    },
    onError: (err) => toast({ tone: 'destructive', title: 'סימון כהושלם נכשל', description: err instanceof Error ? err.message : '' }),
  })

  return { markLost, reopen, complete }
}
