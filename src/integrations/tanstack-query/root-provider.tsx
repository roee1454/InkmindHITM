import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { invalidateEntityLists } from '@/lib/query-keys'
import { parseStaleReference } from '@/lib/stale-reference'

export function getContext() {
  // A server function that was handed the id of a record that no longer exists says so with a
  // stale-reference error (src/lib/stale-reference.ts). Whichever screen hit it, refresh every
  // list that could still be showing that record, so the next click uses a live id.
  const refreshListsOnStaleReference = (error: unknown) => {
    const collection = parseStaleReference(error)
    if (collection) void invalidateEntityLists(queryClient, collection)
  }

  // `queryClient` is referenced inside its own cache callbacks (above and below) — safe because
  // they only run later (after a query or mutation settles), by which point this `const` has long
  // since finished initializing.
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: refreshListsOnStaleReference }),
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
      onError: refreshListsOnStaleReference,
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
