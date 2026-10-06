import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { parseIntegrityViolation } from '@/features/database/utils/integrity-codes'
import {
  createAppointment,
  createConversation,
  createCustomer,
  createStaff,
  exists,
  hoursFromNow,
  superuserClient,
  tryDelete,
} from './helpers/pocketbase'

// Rules from pocketbase/pb_hooks/projects.pb.js: every customer appointment belongs to a project
// of the same customer, whichever code path creates it.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function projectsOf(customerId: string) {
  return pb.collection('projects').getFullList({ filter: pb.filter('customer = {:c}', { c: customerId }) })
}

describe('projects', () => {
  it('gives an appointment booked without a project its own new project', async () => {
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const appointment = await pb.collection('appointments').create({
      customer: customer.id,
      staff: artist.id,
      start_time: hoursFromNow(30),
      status: 'pending',
      tattoo_description: 'שרוול יפני על הרגל',
    })

    const [project] = await projectsOf(customer.id)
    expect(appointment.project).toBe(project?.id)
    expect(project).toMatchObject({ title: 'שרוול יפני על הרגל', primary_staff: artist.id })
    expect(appointment).toMatchObject({ kind: 'session', type: 'tattoo' })
  })

  it('keeps kind and the legacy type in sync in both directions', async () => {
    const customer = await createCustomer(pb)
    const sketch = await createAppointment(pb, { customer: customer.id, startsInHours: 10, status: 'pending' })
    const consultation = await pb.collection('appointments').update(sketch.id, { type: 'sketch' })
    expect(consultation.kind).toBe('consultation')

    const touchUp = await pb.collection('appointments').update(sketch.id, { kind: 'touch_up' })
    expect(touchUp.type).toBe('tattoo')

    // Re-saving the legacy type must not demote a touch-up to a plain session.
    const resaved = await pb.collection('appointments').update(sketch.id, { type: 'tattoo', notes: 'x' })
    expect(resaved.kind).toBe('touch_up')
  })

  it('keeps a follow-up session in the project of its consultation', async () => {
    const customer = await createCustomer(pb)
    const consultation = await pb.collection('appointments').create({
      customer: customer.id,
      start_time: hoursFromNow(-48),
      status: 'completed',
      kind: 'consultation',
    })
    const session = await pb.collection('appointments').create({
      customer: customer.id,
      project: consultation.project,
      start_time: hoursFromNow(200),
      status: 'pending',
    })

    expect(session.project).toBe(consultation.project)
    expect(await projectsOf(customer.id)).toHaveLength(1)
  })

  it("rejects a project that belongs to another customer", async () => {
    const owner = await createCustomer(pb)
    const intruder = await createCustomer(pb)
    const ownersAppointment = await createAppointment(pb, { customer: owner.id, startsInHours: 10, status: 'pending' })

    const rejection = await pb
      .collection('appointments')
      .create({ customer: intruder.id, project: ownersAppointment.project, start_time: hoursFromNow(20), status: 'pending' })
      .then(() => null, (err: { response?: { message?: string } }) => err)

    expect(parseIntegrityViolation(rejection?.response?.message)).toBe('project_customer_mismatch')
    expect(await projectsOf(intruder.id)).toHaveLength(0)
  })

  it('moves a single-appointment project with its customer, and splits a shared one', async () => {
    const wrongCustomer = await createCustomer(pb)
    const rightCustomer = await createCustomer(pb)
    const lone = await createAppointment(pb, { customer: wrongCustomer.id, startsInHours: 10, status: 'pending' })

    const moved = await pb.collection('appointments').update(lone.id, { customer: rightCustomer.id })
    expect(moved.project).toBe(lone.project)
    expect((await pb.collection('projects').getOne(lone.project)).customer).toBe(rightCustomer.id)

    const first = await createAppointment(pb, { customer: wrongCustomer.id, startsInHours: 10, status: 'pending' })
    await pb.collection('appointments').create({ customer: wrongCustomer.id, project: first.project, start_time: hoursFromNow(90), status: 'pending' })
    const split = await pb.collection('appointments').update(first.id, { customer: rightCustomer.id })
    expect(split.project).not.toBe(first.project)
    expect((await pb.collection('projects').getOne(split.project)).customer).toBe(rightCustomer.id)
    expect((await pb.collection('projects').getOne(first.project)).customer).toBe(wrongCustomer.id)
  })

  it('rolls the new project back when the appointment itself fails to save', async () => {
    const customer = await createCustomer(pb)
    // start_time is required, so this create fails validation after the hook made a project.
    await expect(pb.collection('appointments').create({ customer: customer.id, status: 'pending' })).rejects.toThrow()
    expect(await projectsOf(customer.id)).toHaveLength(0)
  })

  it("deletes a project's appointments with it and detaches the bot's pointer to it", async () => {
    const customer = await createCustomer(pb)
    const appointment = await createAppointment(pb, { customer: customer.id, startsInHours: -20, status: 'completed' })
    const { conversation } = await createConversation(pb, customer.id)
    await pb.collection('conversations').update(conversation.id, { active_project: appointment.project })

    expect(await tryDelete(pb, 'projects', appointment.project)).toBeNull()

    expect(await exists(pb, 'appointments', appointment.id)).toBe(false)
    expect((await pb.collection('conversations').getOne(conversation.id)).active_project).toBe('')
  })

  it("goes away with the customer", async () => {
    const customer = await createCustomer(pb)
    const appointment = await createAppointment(pb, { customer: customer.id, startsInHours: -20, status: 'completed' })

    expect(await tryDelete(pb, 'customers', customer.id)).toBeNull()
    expect(await exists(pb, 'projects', appointment.project)).toBe(false)
  })
})
