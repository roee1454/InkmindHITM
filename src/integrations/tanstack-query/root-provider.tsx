import { MutationCache, QueryClient } from '@tanstack/react-query'

export function getContext() {
  // `queryClient` is referenced inside its own `mutationCache.onSuccess` closure below — safe
  // because that callback only runs later (after a mutation succeeds), by which point this
  // `const` has long since finished initializing.
  const queryClient: QueryClient = new QueryClient({
    // Global safety net: invalidate everything on every successful mutation, app-wide. Without
    // this, each of the ~80 mutation call sites across the app has to manually enumerate every
    // other screen's query keys it might affect (e.g. a leads mutation remembering to also
    // invalidate `['dashboardData']`) — easy to miss as new screens/mutations are added. Broad
    // invalidation only forces an immediate refetch for currently-mounted queries; inactive ones
    // are just marked stale and refetch next time they mount, so this doesn't cause a burst of
    // background traffic for screens the user isn't looking at.
    mutationCache: new MutationCache({
      onSuccess: () => {
        queryClient.invalidateQueries()
      },
    }),
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        // `refetchOnMount` is intentionally left at the library default (true) — invalidating a
        // query only marks it stale; without refetch-on-mount, a screen you've navigated away
        // from never picks up that invalidation until a hard refresh. That was the actual bug.
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
      },
    }
  })

  return {
    queryClient,
  }
}
export default function TanstackQueryProvider() {}
