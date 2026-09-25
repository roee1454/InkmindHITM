import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createCustomer, hoursFromNow, superuserClient } from './helpers/pocketbase'

// pb_hooks/appointment-lifecycle.pb.js: every appointment status change is stamped and logged,
// with the attribution its writer supplied.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function transitionsOf(appointmentId: string) {
  return pb.collection('state_transitions').getFullList({
    filter: pb.filter("entity = 'appointments' && entity_id = {:id}", { id: appointmentId }),
    sort: 'created',
  })
}

async function book(customerId: string) {
  return pb.collection('appointments').create({
    customer: customerId,
    start_time: hoursFromNow(72),
    ...statusChange('pending', 'bot', 'bot_hold'),
  })
}

describe('appointment lifecycle log', () => {
  it('logs the booking with its attribution and does not keep the attribution on the record', async () => {
    const customer = await createCustomer(pb)
    const appointment = await book(customer.id)

    expect(appointment).toMatchObject({ status_actor: '', status_reason: '' })
    expect(await transitionsOf(appointment.id)).toMatchObject([{ from: '', to: 'pending', actor: 'bot', reason: 'bot_hold' }])
  })

  it('stamps the first confirmation and keeps it when the appointment is confirmed again later', async () => {
    const customer = await createCustomer(pb)
    const appointment = await book(customer.id)

    const confirmed = await pb.collection('appointments').update(appointment.id, statusChange('confirmed', 'staff', 'deposit_verified'))
    expect(confirmed.confirmed_at).not.toBe('')
    expect(confirmed.status_changed_at).not.toBe('')

    await pb.collection('appointments').update(appointment.id, statusChange('pending', 'staff', 'reopen_payment'))
    const reconfirmed = await pb.collection('appointments').update(appointment.id, statusChange('confirmed', 'staff', 'deposit_verified'))
    expect(reconfirmed.confirmed_at).toBe(confirmed.confirmed_at)

    expect((await transitionsOf(appointment.id)).map((t) => `${t.from}>${t.to}`)).toEqual(['>pending', 'pending>confirmed', 'confirmed>pending', 'pending>confirmed'])
  })

  it('records who cancelled, derived from the actor or stated explicitly, and clears it on reinstatement', async () => {
    const customer = await createCustomer(pb)
    const byCustomer = await pb.collection('appointments').update((await book(customer.id)).id, statusChange('cancelled', 'customer', 'customer_request'))
    expect(byCustomer.cancelled_by).toBe('customer')
    expect(byCustomer.cancelled_at).not.toBe('')

    const confirmedOnBehalf = await pb
      .collection('appointments')
      .update((await book(customer.id)).id, statusChange('cancelled', 'staff', 'staff_confirmed_cancel_request', 'customer'))
    expect(confirmedOnBehalf.cancelled_by).toBe('customer')

    const byStudio = await pb.collection('appointments').update((await book(customer.id)).id, statusChange('cancelled', 'staff', 'staff_edit'))
    expect(byStudio.cancelled_by).toBe('studio')

    const reinstated = await pb.collection('appointments').update(byStudio.id, statusChange('pending', 'staff', 'staff_edit'))
    expect(reinstated).toMatchObject({ cancelled_by: '', cancelled_at: '' })
  })

  it('stamps completion', async () => {
    const customer = await createCustomer(pb)
    const appointment = await book(customer.id)
    const completed = await pb.collection('appointments').update(appointment.id, { final_price: 500, ...statusChange('completed', 'staff', 'session_closed') })
    expect(completed.completed_at).not.toBe('')
  })

  it('logs changes made without attribution (e.g. the admin UI) with an empty actor, and ignores non-status edits', async () => {
    const customer = await createCustomer(pb)
    const appointment = await book(customer.id)

    await pb.collection('appointments').update(appointment.id, { notes: 'שינוי הערה בלבד' })
    await pb.collection('appointments').update(appointment.id, { status: 'no_show' })

    const log = await transitionsOf(appointment.id)
    expect(log).toHaveLength(2)
    expect(log[1]).toMatchObject({ from: 'pending', to: 'no_show', actor: '', reason: '' })
  })
})
