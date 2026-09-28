import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCustomerOverview } from '../server/customer-overview'

/**
 * Keyed under the customers list, so everything that already refreshes customers — project
 * milestones, realtime events, deletes — refreshes an open card with it.
 */
export function customerOverviewQueryKey(customerId: string | null) {
  return [...queryKeys.customers, 'overview', customerId] as const
}

export function useCustomerOverview(customerId: string | null) {
  return useQuery({
    queryKey: customerOverviewQueryKey(customerId),
    queryFn: () => getCustomerOverview({ data: { customerId: customerId ?? '' } }),
    enabled: Boolean(customerId),
    staleTime: 0,
  })
}
