import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createConversation, createCustomer, createStaff, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(() => Promise.reject(new Error('tests pass the actor explicitly'))),
}))

const { handleCloseSession } = await import('@/features/payments/server/close-session.server')

let pb: PocketBase
let admin: { id: string; role: 'admin' }

beforeAll(async () => {
  pb = await superuserClient()
  admin = { id: (await createStaff(pb, { role: 'admin' })).id, role: 'admin' }
})

async function paymentsOf(appointmentId: string) {
  return pb.collection('payments').getFullList({ filter: pb.filter('appointment = {:a}', { a: appointmentId }), sort: 'created' })
}

async function session(customerId: string, extra: Record<string, unknown> = {}) {
  return pb.collection('appointments').create({
    customer: customerId,
    start_time: hoursFromNow(-3),
    kind: 'session',
    ...statusChange('confirmed', 'staff', 'test'),
    ...extra,
  })
}

describe('deposit ledger mirror', () => {
  it('records, follows and voids a deposit as the legacy deposit_paid flag changes', async () => {
    const customer = await createCustomer(pb)
    const appointment = await session(customer.id, { deposit_amount: 200 })
    expect(await paymentsOf(appointment.id)).toHaveLength(0)

    await pb.collection('appointments').update(appointment.id, { deposit_paid: true })
    expect(await paymentsOf(appointment.id)).toMatchObject([
      { kind: 'deposit', amount: 200, status: 'verified', project: appointment.project },
    ])

    await pb.collection('appointments').update(appointment.id, { deposit_amount: 250 })
    expect((await paymentsOf(appointment.id))[0]?.amount).toBe(250)

    await pb.collection('appointments').update(appointment.id, { deposit_paid: false })
    expect((await paymentsOf(appointment.id))[0]?.status).toBe('voided')
  })

  it('records a deposit for an appointment created as already paid', async () => {
    const customer = await createCustomer(pb)
    const appointment = await session(customer.id, { deposit_amount: 150, deposit_paid: true })
    expect(await paymentsOf(appointment.id)).toMatchObject([{ kind: 'deposit', amount: 150, status: 'verified' }])
  })
})

describe('completing a session', () => {
  it('requires a final price or an explicit "no charge"', async () => {
    const customer = await createCustomer(pb)
    const unpriced = await session(customer.id)
    const rejection = await pb
      .collection('appointments')
      .update(unpriced.id, statusChange('completed', 'staff', 'test'))
      .then(() => null, (err: { response?: { message?: string } }) => err)
    expect(parseIntegrityViolation(rejection?.response?.message)).toBe('completion_requires_final_price')

    expect((await pb.collection('appointments').update(unpriced.id, { final_price: 900, ...statusChange('completed', 'staff', 'test') })).status).toBe('completed')

    const waived = await session(customer.id, { kind: 'touch_up' })
    expect((await pb.collection('appointments').update(waived.id, { charge_waived: true, ...statusChange('completed', 'staff', 'test') })).status).toBe('completed')
  })

  it('lets consultations and history entered as completed through without a price', async () => {
    const customer = await createCustomer(pb)
    const consultation = await session(customer.id, { kind: 'consultation' })
    expect((await pb.collection('appointments').update(consultation.id, statusChange('completed', 'system', 'test'))).status).toBe('completed')

    const history = await pb.collection('appointments').create({ customer: customer.id, start_time: hoursFromNow(-500), status: 'completed', kind: 'session' })
    expect(history.status).toBe('completed')
  })
})

describe('closing a session', () => {
  it('records the price and the payment together, counts the earlier deposit, and ends the funnel', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id)
    await pb.collection('conversations').update(conversation.id, { state: 'AWAITING_APPOINTMENT' })
    const appointment = await session(customer.id, { staff: artist.id, deposit_amount: 300, deposit_paid: true })

    const finance = await handleCloseSession(
      { appointmentId: appointment.id, finalPrice: 1800, chargeWaived: false, payments: [{ method: 'cash', amount: 1500 }] },
      { su: pb, actor: { id: artist.id, role: 'staff' } },
    )

    expect(await pb.collection('appointments').getOne(appointment.id)).toMatchObject({ status: 'completed', final_price: 1800 })
    expect(await paymentsOf(appointment.id)).toMatchObject([
      { kind: 'deposit', amount: 300 },
      { kind: 'payment', method: 'cash', amount: 1500, status: 'verified', verified_by: artist.id },
    ])
    expect(finance.balance).toEqual({ billed: 1800, paid: 1800, refunded: 0, due: 0, credit: 0 })
    expect((await pb.collection('conversations').getOne(conversation.id)).state).toBe('COMPLETED')
  })

  it('keeps a multi-session project open: deposit credit carries over to the next session', async () => {
    const customer = await createCustomer(pb)
    const first = await session(customer.id, { deposit_amount: 500, deposit_paid: true })
    await pb.collection('appointments').create({
      customer: customer.id,
      project: first.project,
      start_time: hoursFromNow(24 * 30),
      kind: 'session',
      ...statusChange('confirmed', 'staff', 'test'),
    })

    const finance = await handleCloseSession(
      { appointmentId: first.id, finalPrice: 2000, chargeWaived: false, payments: [{ method: 'bit', amount: 2000 }] },
      { su: pb, actor: admin },
    )
    expect(finance.balance).toMatchObject({ billed: 2000, paid: 2500, due: 0, credit: 500 })
  })

  it('refuses consultations, sessions already closed, a missing price, and another artist', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const consultation = await session(customer.id, { kind: 'consultation' })
    await expect(handleCloseSession({ appointmentId: consultation.id, finalPrice: 100, chargeWaived: false, payments: [] }, { su: pb, actor: admin })).rejects.toThrow('פגישת ייעוץ')

    const open = await session(customer.id, { staff: artist.id })
    await expect(handleCloseSession({ appointmentId: open.id, finalPrice: null, chargeWaived: false, payments: [] }, { su: pb, actor: admin })).rejects.toThrow('מחיר סופי')
    await expect(
      handleCloseSession({ appointmentId: open.id, finalPrice: 500, chargeWaived: false, payments: [] }, { su: pb, actor: { id: 'someone-else', role: 'staff' } }),
    ).rejects.toThrow('אין הרשאה')

    await handleCloseSession({ appointmentId: open.id, finalPrice: 500, chargeWaived: false, payments: [] }, { su: pb, actor: admin })
    await expect(handleCloseSession({ appointmentId: open.id, finalPrice: 500, chargeWaived: false, payments: [] }, { su: pb, actor: admin })).rejects.toThrow('כבר נסגר')
  })

  it('records the payments once when the same session is closed twice at the same time', async () => {
    const customer = await createCustomer(pb)
    const appointment = await session(customer.id)
    const close = () =>
      handleCloseSession(
        { appointmentId: appointment.id, finalPrice: 600, chargeWaived: false, payments: [{ method: 'cash', amount: 600 }] },
        { su: pb, actor: admin },
      )

    const results = await Promise.allSettled([close(), close()])

    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
    expect(await paymentsOf(appointment.id)).toHaveLength(1)
  })

  it('saves nothing when any part of the close-out fails', async () => {
    const customer = await createCustomer(pb)
    const appointment = await session(customer.id, { notes: '__failpoint_update__' })

    await expect(
      handleCloseSession(
        { appointmentId: appointment.id, finalPrice: 700, chargeWaived: false, payments: [{ method: 'cash', amount: 700 }] },
        { su: pb, actor: admin },
      ),
    ).rejects.toThrow('שום דבר לא נשמר')

    expect(await paymentsOf(appointment.id)).toHaveLength(0)
    expect((await pb.collection('appointments').getOne(appointment.id)).status).toBe('confirmed')
    // The failpoint marker must not trip other files' tests that sweep every appointment.
    await pb.collection('appointments').delete(appointment.id)
  })
})
