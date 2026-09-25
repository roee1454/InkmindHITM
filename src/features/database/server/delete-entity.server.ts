import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from '@/features/settings/server/helpers.server'
import { cancelPendingBotTurn } from '@/integrations/ai/engine/turn-cancellation.server'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { conversationLock } from '@/lib/async-lock'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { impactFilter, planDeleteImpact } from '../utils/relation-graph'
import { parseIntegrityViolation } from '../utils/integrity-codes'
import { getRelationEdges } from './relation-schema.server'
import { drainIntegrationOutbox } from './integration-outbox.server'
import type {
  ActiveAppointmentSummary,
  DeletableCollection,
  DeleteBlocker,
  DeleteEntityResult,
  DeleteImpactItem,
  DeleteImpactResult,
} from '../types'

/**
 * Deleting records. PocketBase does the actual work in one transaction — relation cascades from
 * the schema, extra rules from pb_hooks/data-integrity.pb.js — so this module only decides whether
 * the caller may delete, explains what will happen, stops a running bot turn first, and turns
 * PocketBase's answer into a typed result. See docs/architecture.md §8.
 */

type Actor = Pick<StaffRecord, 'id' | 'role'>

export interface DeleteDeps {
  su?: PocketBase
  actor?: Actor
  now?: Date
}

interface DeleteTarget {
  collection: DeletableCollection
  id: string
}

/** Bookkeeping collections that never belong in a delete preview. */
const IMPACT_IGNORED_COLLECTIONS = ['deletion_log', 'integration_outbox']

async function resolveDeps(deps: DeleteDeps) {
  const actor = deps.actor ?? (await requireAuth()).staff
  const su = deps.su ?? (await getSuperuserClient())
  return { actor, su, now: deps.now ?? new Date() }
}

async function findRecord(su: PocketBase, { collection, id }: DeleteTarget): Promise<RecordModel | null> {
  const expand = collection === 'appointments' || collection === 'conversations' ? 'customer' : undefined
  try {
    return await su.collection(collection).getOne(id, { expand })
  } catch (err) {
    if (err instanceof ClientResponseError && err.status === 404) return null
    throw err
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function customerNameOf(record: RecordModel): string {
  const customer: unknown = record.expand?.customer
  if (customer && typeof customer === 'object' && 'name' in customer) {
    const name = text(customer.name) || ('phone' in customer ? text(customer.phone) : '')
    if (name) return name
  }
  return text(record.customer_name_override) || 'לקוח'
}

export function describeRecord(collection: DeletableCollection, record: RecordModel): string {
  switch (collection) {
    case 'customers':
      return text(record.name) || text(record.phone) || 'לקוח ללא שם'
    case 'staff':
      return text(record.name) || text(record.email) || 'איש צוות'
    case 'conversations':
      return `שיחה עם ${customerNameOf(record)}`
    case 'appointments': {
      const date = text(record.start_time).slice(0, 10)
      return date ? `תור של ${customerNameOf(record)} (${date})` : `תור של ${customerNameOf(record)}`
    }
  }
}

function isAdmin(actor: Actor): boolean {
  return actor.role === 'owner' || actor.role === 'admin'
}

/** Owners/admins may delete anything; other staff only their own or unassigned appointments. */
export function canDelete(actor: Actor, collection: DeletableCollection, record: RecordModel): boolean {
  if (isAdmin(actor)) return true
  if (collection !== 'appointments') return false
  const assignee = text(record.staff)
  return !assignee || assignee === actor.id
}

/** Mirrors the guard in pb_hooks/lib/data-integrity.js, but returns the details the UI shows. */
async function findActiveAppointments(su: PocketBase, customerId: string, now: Date): Promise<ActiveAppointmentSummary[]> {
  const records = await su.collection('appointments').getFullList({
    filter: su.filter("customer = {:id} && start_time > {:now} && (status = 'pending' || status = 'confirmed')", {
      id: customerId,
      now,
    }),
    sort: 'start_time',
    expand: 'staff',
  })
  return records.map((record) => {
    const staff: unknown = record.expand?.staff
    const staffName = staff && typeof staff === 'object' && 'name' in staff ? text(staff.name) || null : null
    return { id: record.id, startTime: text(record.start_time), status: text(record.status), staffName }
  })
}

async function findBlockers(
  su: PocketBase,
  actor: Actor,
  target: DeleteTarget,
  record: RecordModel,
  now: Date,
): Promise<DeleteBlocker[]> {
  if (target.collection === 'customers') {
    const appointments = await findActiveAppointments(su, target.id, now)
    return appointments.length > 0 ? [{ code: 'active_appointments', appointments }] : []
  }
  if (target.collection === 'staff') {
    if (actor.id === target.id) return [{ code: 'self_delete' }]
    if (record.role === 'owner') {
      const otherOwners = await su.collection('staff').getList(1, 1, {
        filter: su.filter("role = 'owner' && id != {:id}", { id: target.id }),
        fields: 'id',
      })
      if (otherOwners.items.length === 0) return [{ code: 'last_owner' }]
    }
  }
  return []
}

async function countImpact(su: PocketBase, target: DeleteTarget): Promise<DeleteImpactItem[]> {
  const nodes = planDeleteImpact(await getRelationEdges(su), target.collection, { ignore: IMPACT_IGNORED_COLLECTIONS })
  const items = await Promise.all(
    nodes.map(async (node) => {
      const page = await su.collection(node.collection).getList(1, 1, {
        filter: su.filter(impactFilter(node), { id: target.id }),
        fields: 'id',
      })
      return { collection: node.collection, policy: node.policy, count: page.totalItems }
    }),
  )
  return items.filter((item) => item.count > 0)
}

function restrictedRelationBlockers(items: DeleteImpactItem[]): DeleteBlocker[] {
  return items
    .filter((item) => item.policy === 'restrict')
    .map((item): DeleteBlocker => ({ code: 'restricted_relation', collection: item.collection, count: item.count }))
}

export async function handleGetDeleteImpact(target: DeleteTarget, deps: DeleteDeps = {}): Promise<DeleteImpactResult> {
  const { actor, su, now } = await resolveDeps(deps)
  const record = await findRecord(su, target)
  if (!record) return { status: 'not_found' }
  if (!canDelete(actor, target.collection, record)) return { status: 'forbidden' }

  const [items, blockers] = await Promise.all([countImpact(su, target), findBlockers(su, actor, target, record, now)])
  return {
    status: 'ok',
    label: describeRecord(target.collection, record),
    items,
    blockers: [...blockers, ...restrictedRelationBlockers(items)],
  }
}

/**
 * A bot turn that is still generating for this conversation could send the customer a WhatsApp
 * reply after its conversation is gone. Abort it, then delete while holding the same lock the
 * turn worker holds, so the aborted turn has fully unwound before the delete starts.
 */
async function withBotTurnStopped<T>(su: PocketBase, target: DeleteTarget, run: () => Promise<T>): Promise<T> {
  let conversationId: string | undefined
  if (target.collection === 'conversations') conversationId = target.id
  if (target.collection === 'customers') {
    const page = await su.collection('conversations').getList(1, 1, {
      filter: su.filter('customer = {:id}', { id: target.id }),
      fields: 'id',
    })
    conversationId = page.items[0]?.id
  }
  if (!conversationId) return run()
  cancelPendingBotTurn(conversationId)
  return conversationLock.runExclusive(conversationId, run)
}

async function toDeleteFailure(su: PocketBase, target: DeleteTarget, err: unknown, now: Date): Promise<DeleteEntityResult> {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) return { status: 'not_found' }
    const violation = parseIntegrityViolation(err.response?.message)
    if (violation === 'customer_has_active_appointments') {
      return { status: 'blocked', blocker: { code: 'active_appointments', appointments: await findActiveAppointments(su, target.id, now) } }
    }
    if (violation === 'last_owner') return { status: 'blocked', blocker: { code: 'last_owner' } }
  }
  console.error(`[delete-entity] deleting ${target.collection}/${target.id} failed:`, err)
  return { status: 'failed', message: formatDatabaseError(err, 'מחיקת הרשומה נכשלה.') }
}

export async function handleDeleteEntity(target: DeleteTarget, deps: DeleteDeps = {}): Promise<DeleteEntityResult> {
  const { actor, su, now } = await resolveDeps(deps)
  const record = await findRecord(su, target)
  if (!record) return { status: 'not_found' }
  if (!canDelete(actor, target.collection, record)) return { status: 'forbidden' }

  // Checked here for a friendly answer; PocketBase enforces the same rules inside the transaction,
  // which also covers the race where an appointment is booked between this check and the delete.
  const [blocker] = await findBlockers(su, actor, target, record, now)
  if (blocker) return { status: 'blocked', blocker }

  const label = describeRecord(target.collection, record)
  const impact = await countImpact(su, target)

  try {
    await withBotTurnStopped(su, target, () => su.collection(target.collection).delete(target.id))
  } catch (err) {
    return toDeleteFailure(su, target, err, now)
  }

  await su
    .collection('deletion_log')
    .create({ target_collection: target.collection, target_id: target.id, label, actor: actor.id, impact })
    .catch((err: unknown) => console.error('[delete-entity] failed to write deletion_log:', err))
  // Google Calendar cleanup for the deleted appointments, queued by the hooks in the same transaction.
  drainIntegrationOutbox(su).catch((err: unknown) => console.error('[delete-entity] outbox drain failed:', err))

  return { status: 'deleted', label }
}
