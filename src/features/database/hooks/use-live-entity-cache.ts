import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RecordModel } from 'pocketbase'
import { getBrowserClient } from '@/integrations/pocketbase/client'
import { useClockJumpGuard } from '@/hooks/useClockJumpGuard'
import { useCrossTabInvalidation } from '@/hooks/useCrossTabInvalidation'
import { invalidateEntityLists, queryKeys } from '@/lib/query-keys'
import type { Customer } from '@/features/customers/types'

interface LiveEntityCacheProps {
  sessionToken?: string
  sessionStaff?: RecordModel
}

/**
 * Keeps cached customer/staff lists in step with the database, so an id picked from a list is an
 * id that still exists. Complements useDashboardRealtime (messages, conversations, appointments,
 * notifications) with the two collections it doesn't cover, and adds the cache-wide safety nets:
 * wall-clock jumps and changes made in another tab.
 */
export function useLiveEntityCache({ sessionToken, sessionStaff }: LiveEntityCacheProps): void {
  const queryClient = useQueryClient()
  useClockJumpGuard(queryClient)
  useCrossTabInvalidation(queryClient)

  const staffId = sessionStaff?.id

  useEffect(() => {
    if (!sessionToken || !staffId) return

    const pb = getBrowserClient()
    if (sessionStaff) pb.authStore.save(sessionToken, sessionStaff)

    void pb.collection('customers').subscribe('*', (event) => {
      if (event.action === 'delete') {
        queryClient.setQueryData<Customer[]>(queryKeys.customers, (customers) =>
          customers?.filter((customer) => customer.id !== event.record.id),
        )
        void invalidateEntityLists(queryClient, 'customers')
        return
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers })
    })

    void pb.collection('staff').subscribe('*', (event) => {
      if (event.action === 'delete') {
        void invalidateEntityLists(queryClient, 'staff')
        return
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.staffList })
    })

    return () => {
      void pb.collection('customers').unsubscribe('*')
      void pb.collection('staff').unsubscribe('*')
    }
    // sessionStaff is read only to seed the auth store; re-subscribing on every render of a new
    // object with the same id would drop and re-open the realtime connection needlessly.
  }, [queryClient, sessionToken, staffId])
}
