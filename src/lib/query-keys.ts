import type { QueryClient, QueryKey } from '@tanstack/react-query'

/** Records the CRM lists, deletes, and keeps live over realtime. */
export type EntityCollection = 'customers' | 'conversations' | 'appointments' | 'staff'

export const queryKeys = {
  customers: ['customers'],
  conversations: ['conversations'],
  appointments: ['appointments'],
  staffList: ['staff-list'],
  /** The projects board and leads (listPipeline); the home screen reads it too. */
  pipeline: ['pipeline'],
} as const satisfies Record<string, QueryKey>

/**
 * Every cached list that can show a record of the given collection. Used wherever the cache must
 * forget a record: after a delete, on a realtime event, and when a server function reports that
 * an id the client sent no longer exists (see src/lib/stale-reference.ts).
 */
const LISTS_SHOWING: Record<EntityCollection, QueryKey[]> = {
  customers: [queryKeys.customers, queryKeys.conversations, queryKeys.appointments, queryKeys.pipeline],
  conversations: [queryKeys.conversations, queryKeys.customers, queryKeys.pipeline],
  appointments: [queryKeys.appointments, queryKeys.customers, queryKeys.pipeline],
  staff: [queryKeys.staffList, queryKeys.appointments],
}

export function invalidateEntityLists(queryClient: QueryClient, collection: EntityCollection): Promise<void> {
  return Promise.all(LISTS_SHOWING[collection].map((queryKey) => queryClient.invalidateQueries({ queryKey }))).then(
    () => undefined,
  )
}
