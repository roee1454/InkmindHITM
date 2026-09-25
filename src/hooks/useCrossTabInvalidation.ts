import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'

const CHANNEL_NAME = 'inkmind-query-invalidation'

/**
 * Every tab has its own QueryClient, so the app-wide "invalidate everything after a successful
 * mutation" rule (integrations/tanstack-query/root-provider.tsx) only reaches the tab that made
 * the change. This relays it: a mutation that succeeds here marks every other open tab stale too.
 */
export function useCrossTabInvalidation(queryClient: QueryClient): void {
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return

    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = () => {
      void queryClient.invalidateQueries()
    }
    const unsubscribe = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') channel.postMessage('invalidate')
    })

    return () => {
      unsubscribe()
      channel.close()
    }
  }, [queryClient])
}
