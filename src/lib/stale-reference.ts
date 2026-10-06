import type { EntityCollection } from './query-keys'

/**
 * When a server function receives the id of a record that no longer exists — almost always sent
 * from a stale client cache — it must say so instead of silently falling back (the fallback in
 * startConversationWithTemplate once created a duplicate customer from a deleted id).
 *
 * The code travels inside the message because TanStack Start serializes thrown errors down to
 * their message: formatDatabaseError strips it before display, and the QueryClient's global error
 * handlers parse it to refresh the lists that still show the dead record.
 */
const CODE_PATTERN = /^\[stale-reference:(customers|conversations|appointments|staff)\]\s*/

export function createStaleReferenceError(collection: EntityCollection, userMessage: string): Error {
  return new Error(`[stale-reference:${collection}] ${userMessage}`)
}

export function parseStaleReference(error: unknown): EntityCollection | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  const match = CODE_PATTERN.exec(message)
  const collection = match?.[1]
  return collection === 'customers' || collection === 'conversations' || collection === 'appointments' || collection === 'staff'
    ? collection
    : null
}

/** Removes the machine-readable prefix so only the Hebrew explanation reaches the user. */
export function stripErrorCode(message: string): string {
  return message.replace(CODE_PATTERN, '')
}
