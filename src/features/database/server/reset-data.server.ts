import type PocketBase from 'pocketbase'
import { cancelPendingBotTurn } from '@/integrations/ai/engine/turn-cancellation.server'
import { drainIntegrationOutbox } from './integration-outbox.server'

/**
 * How much a development reset removes:
 * - work: customers, projects, appointments and everything that hangs off them
 * - business: all of the studio's activity (work, plus notifications, waitlist, logs, assistant history)
 *   while the studio itself stays set up: staff, settings, connections, hours, closures, FAQ
 * - everything: every record of every collection, PocketBase's own bookkeeping included (sessions, OAuth links, one-time codes) and staff with the caller's account, so the app starts from first-run setup. The schema stays (migrations own it), and so do the superusers: the server signs in as one.
 */
export type ResetScope = 'work' | 'business' | 'everything'

const WORK_COLLECTIONS = ['conversations', 'payments', 'appointments', 'projects', 'customers']

/** What a studio keeps through a `business` reset: the ones that took setup to build. */
const STUDIO_SETUP_COLLECTIONS = ['studios', 'staff', 'settings', 'credentials', 'artist_profiles', 'studio_closures', 'faq']

/** The superusers the server signs in as; deleting them would lock the app out of its own database. */
const SUPERUSERS = '_superusers'

/** Bookkeeping that outlives its records until the appointments' Google cleanup has run. */
const OUTBOX = 'integration_outbox'

export interface ResetDataResult {
  deleted: Record<string, number>
  total: number
  failed: number
  /** Records still in the collections it tried to empty, per collection: nothing here means the reset was complete. */
  remaining: Record<string, number>
  /** The first failure's message, for the toast; the rest are in the server log. */
  firstError: string | null
}

async function collectionsFor(su: PocketBase, scope: ResetScope): Promise<string[]> {
  if (scope === 'work') return WORK_COLLECTIONS
  const all = await su.collections.getFullList()
  if (scope === 'everything') return all.map((c) => c.name).filter((name) => name !== SUPERUSERS)
  return all.filter((c) => !c.system && !STUDIO_SETUP_COLLECTIONS.includes(c.name)).map((c) => c.name)
}

/**
 * Deletes every record of the given collections. Relations between them decide what can go first (a
 * customer with an upcoming appointment can't be deleted; a required relation blocks its parent), so
 * it sweeps repeatedly until a whole sweep deletes nothing, instead of hard-coding an order.
 */
async function sweep(su: PocketBase, collections: string[], deleted: Record<string, number>): Promise<{ failed: number; firstError: string | null }> {
  let pending = collections
  let failures: { message: string }[] = []
  for (let pass = 0; pass < 6 && pending.length > 0; pass++) {
    failures = []
    const remaining: string[] = []
    let progress = false
    for (const collection of pending) {
      const records = await su.collection(collection).getFullList({ fields: 'id' })
      let left = 0
      for (const { id } of records) {
        // A bot turn still generating could otherwise reply into a conversation that is gone.
        if (collection === 'conversations') cancelPendingBotTurn(id)
        try {
          await su.collection(collection).delete(id)
          deleted[collection] = (deleted[collection] ?? 0) + 1
          progress = true
        } catch (err) {
          left += 1
          failures.push({ message: err instanceof Error ? err.message : String(err) })
          console.error(`[reset-data] deleting ${collection}/${id} failed (pass ${pass + 1}):`, err)
        }
      }
      if (left > 0) remaining.push(collection)
    }
    pending = remaining
    if (!progress) break
  }
  return { failed: failures.length, firstError: failures[0]?.message ?? null }
}

/** Development tool. Appointments go first so the queued Google Calendar deletions run while the credentials still exist. */
export async function resetData(su: PocketBase, scope: ResetScope, options: { drainOutbox?: boolean } = {}): Promise<ResetDataResult> {
  const deleted: Record<string, number> = {}
  const collections = await collectionsFor(su, scope)
  const withoutOutbox = collections.filter((c) => c !== OUTBOX)

  const first = withoutOutbox.includes('appointments') ? await sweep(su, ['appointments'], deleted) : { failed: 0, firstError: null }
  if (options.drainOutbox) await drainIntegrationOutbox(su).catch((err: unknown) => console.error('[reset-data] outbox drain failed:', err))

  const rest = await sweep(su, collections.filter((c) => c !== 'appointments'), deleted)
  const remaining: Record<string, number> = {}
  for (const collection of collections) {
    const { totalItems } = await su.collection(collection).getList(1, 1, { fields: 'id' })
    if (totalItems > 0) remaining[collection] = totalItems
  }
  const total = Object.values(deleted).reduce((sum, n) => sum + n, 0)
  return { deleted, total, failed: first.failed + rest.failed, remaining, firstError: first.firstError ?? rest.firstError }
}
