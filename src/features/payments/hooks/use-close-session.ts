import { useMutation } from '@tanstack/react-query'
import { useIMToast } from '@/components/ui/toast'
import { closeSession } from '../server/payments'
import { formatIls } from '../utils/labels'
import type { CloseSessionInput } from '../types'
import { useProjectFinance } from './use-project-finance'

/** Loads the project's money state for the close-out preview and submits the close-out. */
export function useCloseSession(projectId: string | null, open: boolean, onClosed: () => void) {
  const { toast } = useIMToast()

  const finance = useProjectFinance(projectId, open)

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
