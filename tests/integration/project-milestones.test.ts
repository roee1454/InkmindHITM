import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createCustomer, createStaff, hoursFromNow, superuserClient } from './helpers/pocketbase'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(() => Promise.reject(new Error('tests pass the actor explicitly'))),
}))

const { handleCompleteProject, handleMarkProjectLost, handleReopenProject, recordProjectQuote } = await import(
  '@/features/projects/server/project-milestones.server'
)

let pb: PocketBase
let admin: { id: string; role: 'admin' }

beforeAll(async () => {
  pb = await superuserClient()
  admin = { id: (await createStaff(pb, { role: 'admin' })).id, role: 'admin' }
})

async function booking(customerId: string, kind: string, status: string, hours: number, staff = '') {
  return pb.collection('appointments').create({ customer: customerId, staff, kind, start_time: hoursFromNow(hours), ...statusChange(status as never, 'staff', 'test') })
}

async function lastProjectTransition(projectId: string) {
  const [latest] = await pb.collection('state_transitions').getFullList({
    filter: pb.filter("entity = 'projects' && entity_id = {:id}", { id: projectId }),
    sort: '-created,-id',
  })
  return latest
}

describe('project milestones', () => {
  it('marks a project lost with its reason, logs who did it, and reopens it', async () => {
    const customer = await createCustomer(pb)
    const consultation = await booking(customer.id, 'consultation', 'completed', -48)
    const projectId = consultation.project as string

    const lost = await handleMarkProjectLost({ projectId, reason: 'price', note: 'יקר לו' }, { su: pb, actor: admin })
    expect(lost).toMatchObject({ stage: 'lost', lost_reason: 'price', lost_note: 'יקר לו' })
    expect(await lastProjectTransition(projectId)).toMatchObject({ from: 'consultation_done', to: 'lost', actor: 'staff', reason: 'marked_lost:price' })

    const reopened = await handleReopenProject({ projectId }, { su: pb, actor: admin })
    expect(reopened).toMatchObject({ stage: 'consultation_done', lost_at: '', lost_reason: '' })
  })

  it('refuses to lose a project that still has a booking, inside PocketBase', async () => {
    const customer = await createCustomer(pb)
    const session = await booking(customer.id, 'session', 'confirmed', 72)

    await expect(handleMarkProjectLost({ projectId: session.project as string, reason: 'no_response' }, { su: pb, actor: admin })).rejects.toThrow('תור עתידי פעיל')
    expect((await pb.collection('projects').getOne(session.project as string)).lost_at).toBe('')
  })

  it('completes a project by hand and refuses to complete it twice', async () => {
    const customer = await createCustomer(pb)
    const session = await booking(customer.id, 'session', 'no_show', -24)
    const projectId = session.project as string

    expect(await handleCompleteProject({ projectId }, { su: pb, actor: admin })).toMatchObject({ stage: 'completed' })
    await expect(handleCompleteProject({ projectId }, { su: pb, actor: admin })).rejects.toThrow('כבר הושלם')
  })

  it("lets an artist manage only their own or unassigned projects", async () => {
    const artist = await createStaff(pb)
    const other = await createStaff(pb)
    const customer = await createCustomer(pb)
    const theirs = await booking(customer.id, 'consultation', 'completed', -24, other.id)

    await expect(
      handleMarkProjectLost({ projectId: theirs.project as string, reason: 'price' }, { su: pb, actor: { id: artist.id, role: 'staff' } }),
    ).rejects.toThrow('אין הרשאה')
  })

  it('records a sent quote on the project, which moves it to quoted', async () => {
    const customer = await createCustomer(pb)
    const hold = await booking(customer.id, 'session', 'pending', 96)

    await recordProjectQuote(pb, hold.project as string, { min: 1200, max: 1600 }, new Date())

    expect(await pb.collection('projects').getOne(hold.project as string)).toMatchObject({ stage: 'quoted', quote_min: 1200, quote_max: 1600 })
    expect(await lastProjectTransition(hold.project as string)).toMatchObject({ to: 'quoted', reason: 'price_quote_sent' })
  })

  it("keeps the artist's estimate of the sessions with the quote, and a later quote without one leaves it", async () => {
    const customer = await createCustomer(pb)
    const hold = await booking(customer.id, 'session', 'pending', 96)
    const project = hold.project as string

    await recordProjectQuote(pb, project, { min: 1200, max: 1600, estimatedSessions: 3 }, new Date())
    expect((await pb.collection('projects').getOne(project)).estimated_sessions).toBe(3)

    await recordProjectQuote(pb, project, { min: 1300, max: 1700 }, new Date())
    expect((await pb.collection('projects').getOne(project)).estimated_sessions).toBe(3)

    // Not known yet: stored empty.
    await recordProjectQuote(pb, project, { min: 1300, max: 1700, estimatedSessions: null }, new Date())
    expect((await pb.collection('projects').getOne(project)).estimated_sessions).toBe(0)
  })
})
