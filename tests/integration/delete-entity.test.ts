import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import type { DeleteImpactItem } from '@/features/database/types'
import {
  createAppointment,
  createConversation,
  createCustomer,
  createPayment,
  createStaff,
  createWaitlistEntry,
  exists,
  outboxRowsForAppointment,
  superuserClient,
} from './helpers/pocketbase'

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({
  deleteGoogleCalendarEvent: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(() => Promise.reject(new Error('tests pass the actor explicitly'))),
}))

const { deleteGoogleCalendarEvent } = await import('@/integrations/google-calendar/server/google-auth.server')
const { handleDeleteEntity, handleGetDeleteImpact } = await import('@/features/database/server/delete-entity.server')
const { drainIntegrationOutbox, OUTBOX_MAX_ATTEMPTS } = await import('@/features/database/server/integration-outbox.server')
const { auditIntegrity } = await import('@/features/database/server/integrity-audit.server')

let pb: PocketBase
const admin = { id: 'admin-actor', role: 'admin' } as const

beforeAll(async () => {
  pb = await superuserClient()
})

beforeEach(() => {
  vi.mocked(deleteGoogleCalendarEvent).mockReset().mockResolvedValue(undefined)
})

afterEach(async () => {
  // Every test must leave the database without a single dangling relation.
  const report = await auditIntegrity(pb)
  expect(report.danglingReferences).toEqual([])
})

function itemFor(items: DeleteImpactItem[], collection: string) {
  return items.find((item) => item.collection === collection)
}

describe('delete preview', () => {
  it('lists what a customer delete takes with it, straight from the schema', async () => {
    const customer = await createCustomer(pb, { name: 'דנה' })
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['1', '2', '3'] })
    await pb.collection('audit_log').create({ conversation: conversation.id, actor: 'bot', to_state: 'NEW' })
    await createAppointment(pb, { customer: customer.id, startsInHours: -24, status: 'completed' })
    await createWaitlistEntry(pb, { customer: customer.id, status: 'expired' })

    const impact = await handleGetDeleteImpact({ collection: 'customers', id: customer.id }, { su: pb, actor: admin })

    expect(impact.status).toBe('ok')
    if (impact.status !== 'ok') return
    expect(impact.label).toBe('דנה')
    expect(impact.blockers).toEqual([])
    expect(itemFor(impact.items, 'conversations')).toEqual({ collection: 'conversations', policy: 'cascade', count: 1 })
    expect(itemFor(impact.items, 'messages')).toEqual({ collection: 'messages', policy: 'cascade', count: 3 })
    expect(itemFor(impact.items, 'appointments')).toEqual({ collection: 'appointments', policy: 'cascade', count: 1 })
    expect(itemFor(impact.items, 'waitlist_entries')).toEqual({ collection: 'waitlist_entries', policy: 'cascade', count: 1 })
    expect(itemFor(impact.items, 'audit_log')).toEqual({ collection: 'audit_log', policy: 'nullify', count: 1 })
  })

  it('explains which upcoming appointments block a customer delete', async () => {
    const artist = await createStaff(pb, { name: 'נועה' })
    const customer = await createCustomer(pb)
    const upcoming = await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: 30, status: 'confirmed' })

    const impact = await handleGetDeleteImpact({ collection: 'customers', id: customer.id }, { su: pb, actor: admin })

    expect(impact.status === 'ok' && impact.blockers).toEqual([
      {
        code: 'active_appointments',
        appointments: [{ id: upcoming.id, startTime: upcoming.start_time, status: 'confirmed', staffName: 'נועה' }],
      },
    ])
  })

  it('treats a customer payment history as blocking, not as something the delete takes', async () => {
    const customer = await createCustomer(pb)
    const past = await createAppointment(pb, { customer: customer.id, startsInHours: -72, status: 'completed' })
    await createPayment(pb, { project: past.project })
    await createPayment(pb, { project: past.project, kind: 'payment', status: 'rejected' })

    const impact = await handleGetDeleteImpact({ collection: 'customers', id: customer.id }, { su: pb, actor: admin })

    expect(impact.status === 'ok' && impact.blockers).toEqual([{ code: 'restricted_relation', collection: 'payments', count: 2 }])
    expect(impact.status === 'ok' && itemFor(impact.items, 'payments')).toEqual({ collection: 'payments', policy: 'restrict', count: 2 })
  })

  it('separates what a staff delete removes from what it only unassigns', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    await pb.collection('credentials').create({ staff: artist.id, provider: 'google_calendar', refresh_token: 'rt' })
    await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: 5, status: 'confirmed' })
    await createConversation(pb, customer.id, { assignedStaff: artist.id })

    const impact = await handleGetDeleteImpact({ collection: 'staff', id: artist.id }, { su: pb, actor: admin })

    expect(impact.status === 'ok' && impact.items).toEqual(
      expect.arrayContaining([
        { collection: 'credentials', policy: 'cascade', count: 1 },
        { collection: 'appointments', policy: 'nullify', count: 1 },
        { collection: 'conversations', policy: 'nullify', count: 1 },
      ]),
    )
  })

  it('reports a record that no longer exists instead of throwing', async () => {
    const impact = await handleGetDeleteImpact({ collection: 'customers', id: 'doesnotexist123' }, { su: pb, actor: admin })
    expect(impact).toEqual({ status: 'not_found' })
  })

  it('refuses the preview to staff who may not delete the record', async () => {
    const customer = await createCustomer(pb)
    const impact = await handleGetDeleteImpact(
      { collection: 'customers', id: customer.id },
      { su: pb, actor: { id: 'someone', role: 'staff' } },
    )
    expect(impact).toEqual({ status: 'forbidden' })
  })
})

describe('delete', () => {
  it('deletes a customer, logs who did it, and cleans up their synced Google events', async () => {
    const artist = await createStaff(pb)
    await pb.collection('credentials').create({ staff: artist.id, provider: 'google_calendar', refresh_token: 'rt' })
    const actor = await createStaff(pb, { role: 'admin' })
    const customer = await createCustomer(pb, { name: 'יוסי' })
    await createConversation(pb, customer.id, { messageBodies: ['hi'] })
    const synced = await createAppointment(pb, {
      customer: customer.id,
      staff: artist.id,
      startsInHours: -48,
      status: 'completed',
      googleEventId: 'evt-yossi',
    })

    const result = await handleDeleteEntity({ collection: 'customers', id: customer.id }, { su: pb, actor: { id: actor.id, role: 'admin' } })
    await drainIntegrationOutbox(pb)

    expect(result).toEqual({ status: 'deleted', label: 'יוסי' })
    expect(await exists(pb, 'customers', customer.id)).toBe(false)
    expect(deleteGoogleCalendarEvent).toHaveBeenCalledWith(artist.id, 'evt-yossi')
    expect((await outboxRowsForAppointment(pb, synced.id))[0]).toMatchObject({ status: 'done', attempts: 1 })

    const log = await pb.collection('deletion_log').getFirstListItem(pb.filter('target_id = {:id}', { id: customer.id }))
    expect(log).toMatchObject({ target_collection: 'customers', label: 'יוסי', actor: actor.id })
    expect(log.impact).toEqual(expect.arrayContaining([{ collection: 'messages', policy: 'cascade', count: 1 }]))
  })

  it('returns not_found for a stale id instead of an error', async () => {
    const result = await handleDeleteEntity({ collection: 'conversations', id: 'staleconversat1' }, { su: pb, actor: admin })
    expect(result).toEqual({ status: 'not_found' })
  })

  it('maps a rule enforced inside PocketBase to a typed blocker', async () => {
    const customer = await createCustomer(pb)
    await createAppointment(pb, { customer: customer.id, startsInHours: 24, status: 'pending' })

    // Simulate the race the in-transaction guard exists for: the pre-check runs with a "now" that
    // no longer sees the appointment as upcoming, so only PocketBase's own rule can stop the delete.
    const later = new Date(Date.now() + 72 * 60 * 60 * 1000)
    const result = await handleDeleteEntity({ collection: 'customers', id: customer.id }, { su: pb, actor: admin, now: later })

    expect(result).toMatchObject({ status: 'blocked', blocker: { code: 'active_appointments' } })
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
  })

  it('refuses to delete a customer with payment history before touching anything', async () => {
    const customer = await createCustomer(pb, { name: 'מיכל' })
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['היי'] })
    const past = await createAppointment(pb, { customer: customer.id, startsInHours: -72, status: 'completed' })
    const payment = await createPayment(pb, { project: past.project })

    const result = await handleDeleteEntity({ collection: 'customers', id: customer.id }, { su: pb, actor: admin })

    expect(result).toEqual({ status: 'blocked', blocker: { code: 'restricted_relation', collection: 'payments', count: 1 } })
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
    expect(await exists(pb, 'conversations', conversation.id)).toBe(true)
    expect(await exists(pb, 'payments', payment.id)).toBe(true)
  })

  it('blocks deleting yourself and the last owner', async () => {
    const self = await createStaff(pb, { role: 'admin' })
    expect(await handleDeleteEntity({ collection: 'staff', id: self.id }, { su: pb, actor: { id: self.id, role: 'admin' } })).toEqual({
      status: 'blocked',
      blocker: { code: 'self_delete' },
    })

    const owners = await pb.collection('staff').getFullList({ filter: "role = 'owner'" })
    for (const owner of owners) await pb.collection('staff').update(owner.id, { role: 'admin' })
    const soleOwner = await createStaff(pb, { role: 'owner' })
    expect(await handleDeleteEntity({ collection: 'staff', id: soleOwner.id }, { su: pb, actor: admin })).toEqual({
      status: 'blocked',
      blocker: { code: 'last_owner' },
    })
  })
})

describe('integration outbox', () => {
  async function queuedRowForNewAppointment(googleEventId: string, withCredentials: boolean) {
    const artist = await createStaff(pb)
    if (withCredentials) await pb.collection('credentials').create({ staff: artist.id, provider: 'google_calendar', refresh_token: 'rt' })
    const customer = await createCustomer(pb)
    const appointment = await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: 10, status: 'cancelled', googleEventId })
    await pb.collection('appointments').delete(appointment.id)
    const [row] = await outboxRowsForAppointment(pb, appointment.id)
    if (!row) throw new Error('expected an outbox row')
    return row
  }

  it('backs off and retries when Google fails, then gives up after the last attempt', async () => {
    const row = await queuedRowForNewAppointment('evt-flaky', true)
    vi.mocked(deleteGoogleCalendarEvent).mockRejectedValue(new Error('Google 503'))

    const now = new Date()
    await drainIntegrationOutbox(pb, now)
    const retried = await pb.collection('integration_outbox').getOne(row.id)
    expect(retried).toMatchObject({ status: 'pending', attempts: 1, last_error: 'Google 503' })
    expect(new Date(retried.available_at).getTime()).toBeGreaterThan(now.getTime())

    await pb.collection('integration_outbox').update(row.id, { attempts: OUTBOX_MAX_ATTEMPTS - 1, available_at: now.toISOString() })
    await drainIntegrationOutbox(pb, now)
    expect(await pb.collection('integration_outbox').getOne(row.id)).toMatchObject({ status: 'failed', attempts: OUTBOX_MAX_ATTEMPTS })
  })

  it('finishes without calling Google when the artist no longer has a connection', async () => {
    const row = await queuedRowForNewAppointment('evt-disconnected', false)

    await drainIntegrationOutbox(pb)

    expect(deleteGoogleCalendarEvent).not.toHaveBeenCalled()
    expect(await pb.collection('integration_outbox').getOne(row.id)).toMatchObject({ status: 'done' })
  })
})
