import { useEffect } from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { isClockJump, isFromTheFuture } from '@/lib/clock-jump'
import type { ClockSample } from '@/lib/clock-jump'

const CHECK_INTERVAL_MS = 30_000

function sample(): ClockSample {
  return { wallMs: Date.now(), monotonicMs: performance.now() }
}

/**
 * Refetches the cache when the wall clock jumps (manually changed, NTP correction, a laptop waking
 * up) and whenever a cached query claims to have been fetched in the future. Without it, a query
 * fetched while the clock ran ahead is treated as fresh until real time catches up — neither
 * remounting nor refetchOnMount will touch it.
 */
export function useClockJumpGuard(queryClient: QueryClient): void {
  useEffect(() => {
    let previous = sample()

    const check = () => {
      const current = sample()
      const jumped = isClockJump(previous, current)
      previous = current
      if (jumped) {
        void queryClient.invalidateQueries()
        return
      }
      const futureQueries = queryClient
        .getQueryCache()
        .findAll({ predicate: (query) => isFromTheFuture(query.state.dataUpdatedAt, current.wallMs) })
      for (const query of futureQueries) {
        void queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') check()
    }

    check()
    const interval = setInterval(check, CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [queryClient])
}
