import { useQuery } from '@tanstack/react-query'
import { getProjectFinance } from '../server/payments'

export function projectFinanceQueryKey(projectId: string | null) {
  return ['project-finance', projectId] as const
}

/** A project's ledger and balance: the close-out preview and the project panel both read it. */
export function useProjectFinance(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: projectFinanceQueryKey(projectId),
    queryFn: () => getProjectFinance({ data: { projectId: projectId ?? '' } }),
    enabled: enabled && Boolean(projectId),
    staleTime: 0,
  })
}
