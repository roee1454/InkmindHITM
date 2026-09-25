import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createCustomer, createPayment, createStaff, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(() => Promise.reject(new Error('tests pass the actor explicitly'))),
}))

const { handleGetProjectDetails, handleMoveAppointment, handleUpdateProjectDetails } = await import('@/features/projects/server/project-details.server')
const { loadPipeline } = await import('@/features/projects/server/pipeline.server')

let pb: PocketBase
let admin: { id: string; role: 'admin' }

beforeAll(async () => {
  pb = await superuserClient()
  admin = { id: (await createStaff(pb, { role: 'admin' })).id, role: 'admin' }
})

async function booking(customerId: string, kind: string, status: string, hours: number, extra: Record<string, unknown> = {}) {
  return pb.collection('appointments').create({ customer: customerId, kind, start_time: hoursFromNow(hours), ...statusChange(status as never, 'staff', 'test'), ...extra })
}

describe('project panel', () => {
  it('shows the project with its timeline and the customer’s other projects', async () => {
    const customer = await createCustomer(pb, { name: 'דנה' })
    const consultation = await booking(customer.id, 'consultation', 'completed', -72)
    await booking(customer.id, 'session', 'confirmed', 72, { project: consultation.project })
    const other = await booking(customer.id, 'consultation', 'pending', 96)

    const details = await handleGetProjectDetails(consultation.project as string, { su: pb, actor: admin })

    expect(details).toMatchObject({ stage: 'booked', canManage: true, customer: { id: customer.id, name: 'דנה' } })
    expect(details.timeline.map((a) => [a.kind, a.status])).toEqual([
      ['consultation', 'completed'],
      ['session', 'confirmed'],
    ])
    expect(details.timeline[1]?.projectPosition).toMatchObject({ sessionNumber: 1, hasConsultation: true })
    expect(details.otherProjects.map((p) => p.id)).toEqual([other.project])
  })

  it('saves the name, quote and estimate without moving the stage', async () => {
    const customer = await createCustomer(pb)
    const consultation = await booking(customer.id, 'consultation', 'completed', -24)
    const projectId = consultation.project as string

    await handleUpdateProjectDetails({ projectId, title: 'שרוול יפני', quoteMin: 4500, quoteMax: 6000, estimatedSessions: 3 }, { su: pb, actor: admin })

    expect(await pb.collection('projects').getOne(projectId)).toMatchObject({ title: 'שרוול יפני', quote_min: 4500, quote_max: 6000, estimated_sessions: 3, stage: 'consultation_done' })
    await expect(
      handleUpdateProjectDetails({ projectId, title: 'x', quoteMin: 9000, quoteMax: 1000, estimatedSessions: null }, { su: pb, actor: admin }),
    ).rejects.toThrow('המינימלי גבוה')
  })

  it('moves an appointment to another project or splits it out, and re-derives both', async () => {
    const customer = await createCustomer(pb)
    const consultation = await booking(customer.id, 'consultation', 'completed', -48)
    const misfiled = await booking(customer.id, 'session', 'confirmed', 48, { project: consultation.project })
    const target = await booking(customer.id, 'consultation', 'completed', -24)

    await handleMoveAppointment({ appointmentId: misfiled.id, target: target.project as string }, { su: pb, actor: admin })
    expect((await pb.collection('projects').getOne(consultation.project as string)).stage).toBe('consultation_done')
    expect((await pb.collection('projects').getOne(target.project as string)).stage).toBe('booked')

    const { projectId } = await handleMoveAppointment({ appointmentId: misfiled.id, target: 'new' }, { su: pb, actor: admin })
    expect(projectId).not.toBe(target.project)
    expect(await pb.collection('projects').getOne(projectId)).toMatchObject({ customer: customer.id, stage: 'booked' })
  })

  it('refuses moving an appointment into another customer’s project', async () => {
    const customer = await createCustomer(pb)
    const stranger = await createCustomer(pb)
    const mine = await booking(customer.id, 'consultation', 'pending', 48)
    const theirs = await booking(stranger.id, 'consultation', 'pending', 48)

    await expect(handleMoveAppointment({ appointmentId: mine.id, target: theirs.project as string }, { su: pb, actor: admin })).rejects.toThrow('אותו לקוח')
  })

  it('lets an artist view but not edit another artist’s project', async () => {
    const owner = await createStaff(pb)
    const artist = await createStaff(pb)
    const customer = await createCustomer(pb)
    const consultation = await booking(customer.id, 'consultation', 'pending', 48, { staff: owner.id })
    const projectId = consultation.project as string

    const details = await handleGetProjectDetails(projectId, { su: pb, actor: { id: artist.id, role: 'staff' } })
    expect(details.canManage).toBe(false)
    await expect(
      handleUpdateProjectDetails({ projectId, title: 'x', quoteMin: null, quoteMax: null, estimatedSessions: null }, { su: pb, actor: { id: artist.id, role: 'staff' } }),
    ).rejects.toThrow('אין הרשאה')
  })
})

describe('project panel reschedules', () => {
  it('lists the project’s reschedules, newest first', async () => {
    const customer = await createCustomer(pb)
    const session = await booking(customer.id, 'session', 'confirmed', 48)
    await pb.collection('appointments').update(session.id, { start_time: hoursFromNow(72), status_actor: 'customer', status_reason: 'customer_request' })
    await pb.collection('appointments').update(session.id, { start_time: hoursFromNow(96), status_actor: 'staff', status_reason: 'staff_edit' })

    const { reschedules } = await handleGetProjectDetails(session.project as string, { su: pb, actor: admin })

    expect(reschedules.map((r) => r.actor)).toEqual(['staff', 'customer'])
    expect(reschedules[1]?.fromStart).toBe(session.start_time)
  })
})

describe('pipeline', () => {
  it('lists each project with its stage and balance, against real records', async () => {
    const customer = await createCustomer(pb, { name: 'בדיקת פייפליין' })
    const session = await booking(customer.id, 'session', 'completed', -24, { final_price: 2000 })
    await createPayment(pb, { project: session.project as string, amount: 500 })

    const pipeline = await loadPipeline(pb, admin, new Date())
    const row = pipeline.projects.find((p) => p.projectId === session.project)

    expect(row).toMatchObject({ customerName: 'בדיקת פייפליין', stage: 'in_progress', due: 1500, credit: 0 })
  })
})
