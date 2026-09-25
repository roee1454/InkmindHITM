import { useMutation, useQuery } from '@tanstack/react-query'
import { useToast } from '@/components/ui/ToastProvider'
import { closeSession, getProjectFinance } from '../server/payments'
import { formatIls } from '../utils/labels'
import type { CloseSessionInput } from '../types'

export function projectFinanceQueryKey(projectId: string | null) {
  return ['project-finance', projectId] as const
}

/** Loads the project's money state for the close-out preview and submits the close-out. */
export function useCloseSession(projectId: string | null, open: boolean, onClosed: () => void) {
  const { toast } = useToast()

  const finance = useQuery({
    queryKey: projectFinanceQueryKey(projectId),
    queryFn: () => getProjectFinance({ data: { projectId: projectId ?? '' } }),
    enabled: open && Boolean(projectId),
    staleTime: 0,
  })

  const close = useMutation({
    mutationFn: (input: CloseSessionInput) => closeSession({ data: input }),
    onSuccess: (result) => {
      const { due, credit } = result.balance
      const tail = due > 0 ? `נותרה יתרה של ${formatIls(due)}.` : credit > 0 ? `לזכות הלקוח נשארו ${formatIls(credit)}.` : 'הפרויקט מאוזן.'
      toast('הסשן נסגר', tail, 'success')
      onClosed()
    },
  })

  return { finance, close }
}
