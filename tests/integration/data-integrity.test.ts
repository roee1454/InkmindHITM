import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
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
  tryDelete,
} from './helpers/pocketbase'

// Exercises the schema cascades (1786830040_data_integrity_cascade.js) and the rules in
// pocketbase/pb_hooks/data-integrity.pb.js against a real PocketBase. Deletes go straight through
// the SDK on purpose: the rules must hold for every caller, not only the CRM's own server code.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

describe('deleting a customer', () => {
  it('cascades their conversation, messages, waitlist entries and past appointments in one go', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const { conversation, messages } = await createConversation(pb, customer.id, { messageBodies: ['שלום', 'מה המחיר?'] })
    const pastAppointment = await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: -72, status: 'completed' })
    const cancelledFuture = await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: 48, status: 'cancelled' })
    const waitlistEntry = await createWaitlistEntry(pb, { customer: customer.id, status: 'expired' })

    expect(await tryDelete(pb, 'customers', customer.id)).toBeNull()

    expect(await exists(pb, 'customers', customer.id)).toBe(false)
    expect(await exists(pb, 'conversations', conversation.id)).toBe(false)
    for (const message of messages) expect(await exists(pb, 'messages', message.id)).toBe(false)
    expect(await exists(pb, 'appointments', pastAppointment.id)).toBe(false)
    expect(await exists(pb, 'appointments', cancelledFuture.id)).toBe(false)
    expect(await exists(pb, 'waitlist_entries', waitlistEntry.id)).toBe(false)
    expect(await exists(pb, 'staff', artist.id)).toBe(true)
  })

  it.each(['confirmed', 'pending'])('is blocked while a future %s appointment exists, and nothing is deleted', async (status) => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['היי'] })
    const upcoming = await createAppointment(pb, { customer: customer.id, startsInHours: 24, status })

    const rejection = await tryDelete(pb, 'customers', customer.id)

    expect(rejection?.status).toBe(400)
    expect(parseIntegrityViolation(rejection?.response.message)).toBe('customer_has_active_appointments')
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
    expect(await exists(pb, 'conversations', conversation.id)).toBe(true)
    expect(await exists(pb, 'appointments', upcoming.id)).toBe(true)
  })

  // Payment history is kept (1786830080_protect_payment_history.js): payments.project restricts, so
  // PocketBase refuses the cascade that would take a customer's payments with it — whoever deletes.
  it('is refused while the customer has payment history, and nothing is deleted', async () => {
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['שילמתי'] })
    const past = await createAppointment(pb, { customer: customer.id, startsInHours: -72, status: 'completed' })
    const payment = await createPayment(pb, { project: past.project })

    const rejection = await tryDelete(pb, 'customers', customer.id)

    expect(rejection?.status).toBe(400)
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
    expect(await exists(pb, 'conversations', conversation.id)).toBe(true)
    expect(await exists(pb, 'appointments', past.id)).toBe(true)
    expect(await exists(pb, 'projects', past.project)).toBe(true)
    expect(await exists(pb, 'payments', payment.id)).toBe(true)
  })

  it('goes through once the upcoming appointment is cancelled', async () => {
    const customer = await createCustomer(pb)
    const upcoming = await createAppointment(pb, { customer: customer.id, startsInHours: 24, status: 'confirmed' })
    expect(await tryDelete(pb, 'customers', customer.id)).not.toBeNull()

    await pb.collection('appointments').update(upcoming.id, { status: 'cancelled' })

    expect(await tryDelete(pb, 'customers', customer.id)).toBeNull()
    expect(await exists(pb, 'appointments', upcoming.id)).toBe(false)
  })

  it('runs the appointment rules for appointments removed by the cascade', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const synced = await createAppointment(pb, {
      customer: customer.id,
      staff: artist.id,
      startsInHours: -30,
      status: 'completed',
      googleEventId: 'gcal-event-cascade',
    })

    expect(await tryDelete(pb, 'customers', customer.id)).toBeNull()

    const rows = await outboxRowsForAppointment(pb, synced.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: 'gcal_delete_event',
      status: 'pending',
      payload: { appointmentId: synced.id, staffId: artist.id, googleEventId: 'gcal-event-cascade' },
    })
  })

  it('rolls back everything, including rows written by hooks, when the cascade fails midway', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    // Appointments are cascaded before messages, so by the time the failpoint message is deleted
    // the appointment is already gone and its outbox row already written — inside the transaction.
    const synced = await createAppointment(pb, {
      customer: customer.id,
      staff: artist.id,
      startsInHours: -30,
      status: 'completed',
      googleEventId: 'gcal-event-rollback',
    })
    const { conversation, messages } = await createConversation(pb, customer.id, { messageBodies: ['רגיל', '__failpoint__'] })

    const rejection = await tryDelete(pb, 'customers', customer.id)

    expect(rejection?.response.message).toMatch(/failpoint/i)
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
    expect(await exists(pb, 'appointments', synced.id)).toBe(true)
    expect(await exists(pb, 'conversations', conversation.id)).toBe(true)
    for (const message of messages) expect(await exists(pb, 'messages', message.id)).toBe(true)
    expect(await outboxRowsForAppointment(pb, synced.id)).toHaveLength(0)
  })
})

describe('deleting a conversation', () => {
  it('deletes its messages, keeps the customer, and keeps the audit trail detached', async () => {
    const customer = await createCustomer(pb)
    const { conversation, messages } = await createConversation(pb, customer.id, { messageBodies: ['a', 'b', 'c'] })
    const audit = await pb.collection('audit_log').create({
      conversation: conversation.id,
      actor: 'bot',
      reason: 'test',
      from_state: 'NEW',
      to_state: 'WANTS_TO_BOOK',
    })

    expect(await tryDelete(pb, 'conversations', conversation.id)).toBeNull()

    for (const message of messages) expect(await exists(pb, 'messages', message.id)).toBe(false)
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
    const auditAfter = await pb.collection('audit_log').getOne(audit.id)
    expect(auditAfter.conversation).toBe('')
    expect(auditAfter.to_state).toBe('WANTS_TO_BOOK')
  })
})

describe('deleting an appointment', () => {
  it('snapshots what the Google Calendar cleanup needs into the outbox', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const synced = await createAppointment(pb, {
      customer: customer.id,
      staff: artist.id,
      startsInHours: 10,
      status: 'confirmed',
      googleEventId: 'gcal-event-direct',
    })

    expect(await tryDelete(pb, 'appointments', synced.id)).toBeNull()

    const rows = await outboxRowsForAppointment(pb, synced.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.payload).toEqual({ appointmentId: synced.id, staffId: artist.id, googleEventId: 'gcal-event-direct' })
    expect(rows[0]?.attempts).toBe(0)
  })

  it.each([
    { name: 'no Google event', staff: true, googleEventId: undefined },
    { name: 'no artist', staff: false, googleEventId: 'gcal-event-orphan' },
  ])('enqueues nothing when there is $name', async ({ staff, googleEventId }) => {
    const artist = staff ? await createStaff(pb) : null
    const customer = await createCustomer(pb)
    const appointment = await createAppointment(pb, {
      customer: customer.id,
      staff: artist?.id,
      startsInHours: 10,
      status: 'confirmed',
      googleEventId,
    })

    expect(await tryDelete(pb, 'appointments', appointment.id)).toBeNull()
    expect(await outboxRowsForAppointment(pb, appointment.id)).toHaveLength(0)
  })

  it("cancels the owner's waitlist entry and sends other customers' offers back to waiting", async () => {
    const artist = await createStaff(pb)
    const owner = await createCustomer(pb)
    const other = await createCustomer(pb)
    const appointment = await createAppointment(pb, { customer: owner.id, staff: artist.id, startsInHours: 100, status: 'confirmed' })
    const othersAppointment = await createAppointment(pb, { customer: other.id, staff: artist.id, startsInHours: 300, status: 'confirmed' })
    const ownEntry = await createWaitlistEntry(pb, { customer: owner.id, currentAppointment: appointment.id, status: 'watching' })
    const offeredEntry = await createWaitlistEntry(pb, {
      customer: other.id,
      currentAppointment: othersAppointment.id,
      offeredAppointment: appointment.id,
      status: 'offered',
    })

    expect(await tryDelete(pb, 'appointments', appointment.id)).toBeNull()

    expect(await pb.collection('waitlist_entries').getOne(ownEntry.id)).toMatchObject({ status: 'cancelled', current_appointment: '' })
    expect(await pb.collection('waitlist_entries').getOne(offeredEntry.id)).toMatchObject({
      status: 'watching',
      offered_appointment: '',
      current_appointment: othersAppointment.id,
    })
  })

  it('rolls back the outbox row and waitlist changes when the delete fails', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const appointment = await createAppointment(pb, {
      customer: customer.id,
      staff: artist.id,
      startsInHours: 100,
      status: 'confirmed',
      googleEventId: '__failpoint__',
    })
    const entry = await createWaitlistEntry(pb, { customer: customer.id, currentAppointment: appointment.id, status: 'watching' })

    expect(await tryDelete(pb, 'appointments', appointment.id)).not.toBeNull()

    expect(await exists(pb, 'appointments', appointment.id)).toBe(true)
    expect(await outboxRowsForAppointment(pb, appointment.id)).toHaveLength(0)
    expect(await pb.collection('waitlist_entries').getOne(entry.id)).toMatchObject({ status: 'watching', current_appointment: appointment.id })
  })
})

describe('deleting a staff member', () => {
  it('removes their Google credentials and assistant chats, and unassigns everything else', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const credential = await pb.collection('credentials').create({ staff: artist.id, provider: 'google_calendar', refresh_token: 'rt' })
    const mcpConversation = await pb.collection('mcp_conversations').create({ staff: artist.id, channel: 'web', title: 'x' })
    const mcpMessage = await pb.collection('mcp_messages').create({ conversation: mcpConversation.id, role: 'owner', body: 'מה יש לי מחר?' })
    const appointment = await createAppointment(pb, { customer: customer.id, staff: artist.id, startsInHours: 50, status: 'confirmed' })
    const { conversation, messages } = await createConversation(pb, customer.id, {
      messageBodies: ['נשלח על ידי האמן'],
      assignedStaff: artist.id,
      senderStaff: artist.id,
    })
    const waitlistEntry = await createWaitlistEntry(pb, { customer: customer.id, status: 'watching', preferredStaff: artist.id })

    expect(await tryDelete(pb, 'staff', artist.id)).toBeNull()

    expect(await exists(pb, 'credentials', credential.id)).toBe(false)
    expect(await exists(pb, 'mcp_conversations', mcpConversation.id)).toBe(false)
    expect(await exists(pb, 'mcp_messages', mcpMessage.id)).toBe(false)
    expect((await pb.collection('appointments').getOne(appointment.id)).staff).toBe('')
    expect((await pb.collection('conversations').getOne(conversation.id)).assigned_staff).toBe('')
    expect((await pb.collection('messages').getOne(messages[0]!.id)).sender_staff).toBe('')
    expect((await pb.collection('waitlist_entries').getOne(waitlistEntry.id)).preferred_staff).toBe('')
    expect(await exists(pb, 'customers', customer.id)).toBe(true)
  })

  it('refuses to delete the last owner but allows it when another owner remains', async () => {
    // The integration database may already contain owners from other tests; demote them so this
    // test controls the owner count.
    const existingOwners = await pb.collection('staff').getFullList({ filter: "role = 'owner'" })
    for (const owner of existingOwners) await pb.collection('staff').update(owner.id, { role: 'admin' })

    const soleOwner = await createStaff(pb, { role: 'owner' })
    const rejection = await tryDelete(pb, 'staff', soleOwner.id)
    expect(parseIntegrityViolation(rejection?.response.message)).toBe('last_owner')

    const secondOwner = await createStaff(pb, { role: 'owner' })
    expect(await tryDelete(pb, 'staff', soleOwner.id)).toBeNull()
    expect(await exists(pb, 'staff', secondOwner.id)).toBe(true)
  })
})
