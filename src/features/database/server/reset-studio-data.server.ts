import type PocketBase from 'pocketbase'
import { cancelPendingBotTurn } from '@/integrations/ai/engine/turn-cancellation.server'
import { drainIntegrationOutbox } from './integration-outbox.server'

/**
 * Children before parents, so nothing is blocked by a required relation: a conversation takes its
 * messages with it, payments hang off projects and appointments, and a customer with an upcoming
 * appointment can't be deleted (pb_hooks/data-integrity.pb.js), so appointments go first.
 */
export const RESET_ORDER = ['conversations', 'payments', 'appointments', 'projects', 'customers'] as const
export type ResettableCollection = (typeof RESET_ORDER)[number]

export interface ResetStudioDataResult {
  deleted: Record<ResettableCollection, number>
  failed: number
  /** The first failure's message, for the toast; the rest are in the server log. */
  firstError: string | null
}

/** Development tool: empties customers, projects, appointments and everything that hangs off them. */
export async function resetStudioData(su: PocketBase, options: { drainOutbox?: boolean } = {}): Promise<ResetStudioDataResult> {
  const deleted = Object.fromEntries(RESET_ORDER.map((c) => [c, 0])) as Record<ResettableCollection, number>
  let failed = 0
  let firstError: string | null = null

  for (const collection of RESET_ORDER) {
    const records = await su.collection(collection).getFullList({ fields: 'id' })
    for (const { id } of records) {
      // A bot turn still generating could otherwise reply into a conversation that is gone.
      if (collection === 'conversations') cancelPendingBotTurn(id)
      try {
        await su.collection(collection).delete(id)
        deleted[collection] += 1
      } catch (err) {
        failed += 1
        firstError ??= err instanceof Error ? err.message : String(err)
        console.error(`[reset-studio-data] deleting ${collection}/${id} failed:`, err)
      }
    }
  }

  // Deleted appointments queue the removal of their Google Calendar events.
  if (options.drainOutbox) await drainIntegrationOutbox(su).catch((err: unknown) => console.error('[reset-studio-data] outbox drain failed:', err))
  return { deleted, failed, firstError }
}
