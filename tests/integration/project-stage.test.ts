import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createCustomer, exists, hoursFromNow, superuserClient, tryDelete } from './helpers/pocketbase'

// pb_hooks/project-stage.pb.js + appointment-lifecycle.pb.js: a project's stage follows its
// appointments and milestones, inside the same transaction, with the writer's attribution.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

async function stageOf(projectId: string): Promise<string> {
  return (await pb.collection('projects').getOne(projectId)).stage as string
}

async function projectTransitions(projectId: string) {
  return pb.collection('state_transitions').getFullList({
    filter: pb.filter("entity = 'projects' && entity_id = {:id}", { id: projectId }),
    sort: 'created,id',
  })
}

async function book(customerId: string, kind: string, status: string, project?: string): Promise<RecordModel> {
  return pb.collection('appointments').create({
    customer: customerId,
    project: project ?? '',
    kind,
    start_time: hoursFromNow(48),
    ...statusChange(status as never, 'bot', 'bot_hold'),
  })
}

function update(appointmentId: string, fields: Record<string, unknown>) {
  return pb.collection('appointments').update(appointmentId, fields)
}

describe('project stage', () => {
  it('walks the funnel from consultation to a finished multi-session piece', async () => {
    const customer = await createCustomer(pb)
    const consultation = await book(customer.id, 'consultation', 'pending')
    const projectId = consultation.project as string
    expect(await stageOf(projectId)).toBe('consultation_scheduled')

    await update(consultation.id, statusChange('completed', 'system', 'auto_complete_24h'))
    expect(await stageOf(projectId)).toBe('consultation_done')

    await pb.collection('projects').update(projectId, { quote_min: 1500, quote_max: 2000, quote_sent_at: new Date().toISOString(), stage_actor: 'staff', stage_reason: 'price_quote_sent' })
    expect(await stageOf(projectId)).toBe('quoted')

    const session1 = await book(customer.id, 'session', 'pending', projectId)
    await update(session1.id, statusChange('confirmed', 'staff', 'deposit_verified'))
    expect(await stageOf(projectId)).toBe('booked')

    await update(session1.id, { final_price: 1800, ...statusChange('completed', 'staff', 'session_closed') })
    expect(await stageOf(projectId)).toBe('in_progress')

    await pb.collection('projects').update(projectId, { completed_at: new Date().toISOString(), stage_actor: 'staff', stage_reason: 'last_session_closed' })
    expect(await stageOf(projectId)).toBe('completed')

    expect((await projectTransitions(projectId)).map((t) => [t.from, t.to, t.actor, t.reason])).toEqual([
      ['inquiry', 'consultation_scheduled', 'bot', 'bot_hold'],
      ['consultation_scheduled', 'consultation_done', 'system', 'auto_complete_24h'],
      ['consultation_done', 'quoted', 'staff', 'price_quote_sent'],
      ['quoted', 'booked', 'staff', 'deposit_verified'],
      ['booked', 'in_progress', 'staff', 'session_closed'],
      ['in_progress', 'completed', 'staff', 'last_session_closed'],
    ])
  })

  it('moves back when the booked session is cancelled', async () => {
    const customer = await createCustomer(pb)
    const session = await book(customer.id, 'session', 'confirmed')
    await pb.collection('projects').update(session.project as string, { quote_sent_at: new Date().toISOString() })
    expect(await stageOf(session.project as string)).toBe('booked')

    await update(session.id, statusChange('cancelled', 'customer', 'customer_request'))
    expect(await stageOf(session.project as string)).toBe('quoted')
  })

  it('does not keep a stage someone wrote by hand, and does not keep the attribution', async () => {
    const customer = await createCustomer(pb)
    const consultation = await book(customer.id, 'consultation', 'pending')

    const project = await pb.collection('projects').update(consultation.project as string, { stage: 'completed', stage_actor: 'staff', stage_reason: 'manual' })

    expect(project).toMatchObject({ stage: 'consultation_scheduled', stage_actor: '', stage_reason: '' })
  })

  it('re-derives both projects when an appointment moves between them', async () => {
    const customer = await createCustomer(pb)
    const first = await book(customer.id, 'consultation', 'confirmed')
    const second = await book(customer.id, 'consultation', 'pending')
    expect(await stageOf(first.project as string)).toBe('consultation_scheduled')

    await update(first.id, { project: second.project })

    expect(await stageOf(first.project as string)).toBe('inquiry')
    expect(await stageOf(second.project as string)).toBe('consultation_scheduled')
  })

  it('re-derives the project when one of its appointments is deleted', async () => {
    const customer = await createCustomer(pb)
    const consultation = await book(customer.id, 'consultation', 'completed')
    const session = await book(customer.id, 'session', 'confirmed', consultation.project as string)
    expect(await stageOf(consultation.project as string)).toBe('booked')

    expect(await tryDelete(pb, 'appointments', session.id)).toBeNull()
    expect(await stageOf(consultation.project as string)).toBe('consultation_done')
  })

  it('does not get in the way of deleting a customer with projects', async () => {
    const customer = await createCustomer(pb)
    const consultation = await book(customer.id, 'consultation', 'completed')
    await book(customer.id, 'session', 'cancelled', consultation.project as string)

    expect(await tryDelete(pb, 'customers', customer.id)).toBeNull()
    expect(await exists(pb, 'projects', consultation.project as string)).toBe(false)
  })
})
