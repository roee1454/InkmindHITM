import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { getCustomers } from '../server/customers'
import type { Customer } from '../types'

/**
 * The one definition of the customer-list query, shared by every screen that lets staff pick a
 * customer. Ids from this list go straight back to the server (delete, new conversation, booking),
 * so it favours freshness: a short staleTime and a refetch on window focus, on top of the realtime
 * invalidation in useLiveEntityCache.
 */
export function customersQueryOptions() {
  return queryOptions<Customer[]>({
    queryKey: queryKeys.customers,
    queryFn: () => getCustomers(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  })
}
