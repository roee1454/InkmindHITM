import { beforeAll, describe, expect, it } from 'vitest'
import type PocketBase from 'pocketbase'
import { statusChange } from '@/features/calendar/utils/appointment-transitions'
import { createCustomer, createPayment, hoursFromNow, superuserClient } from './helpers/pocketbase'

const { loadProjectPromptContext } = await import('@/integrations/ai/engine/project-context.server')

// The project facts a bot turn reads (track-b B4.1), loaded from a real PocketBase.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

describe('loadProjectPromptContext', () => {
  it('reads the artist estimate, the finished sessions, the next booked one and the verified deposit', async () => {
    const customer = await createCustomer(pb)
    const first = await pb.collection('appointments').create({
      customer: customer.id,
      kind: 'session',
      start_time: hoursFromNow(-24 * 10),
      final_price: 1200,
      ...statusChange('completed', 'staff', 'test'),
    })
    const project = first.project as string
    await pb.collection('projects').update(project, { estimated_sessions: 3, quote_min: 1100, quote_max: 1400 })
    await pb.collection('appointments').create({
      customer: customer.id,
      project,
      kind: 'session',
      start_time: hoursFromNow(24 * 14),
      ...statusChange('confirmed', 'staff', 'test'),
    })
    await createPayment(pb, { project, kind: 'deposit', amount: 300 })

    const ctx = await loadProjectPromptContext(pb, project, new Date())

    expect(ctx).toMatchObject({ sessionsDone: 1, estimatedSessions: 3, quote: { min: 1100, max: 1400 }, depositPaid: 300, nextSessionFrom: null })
    expect(ctx?.nextBooked).not.toBeNull()
  })

  it('gives nothing for a conversation without a project, or a project that is gone', async () => {
    expect(await loadProjectPromptContext(pb, '', new Date())).toBeNull()
    expect(await loadProjectPromptContext(pb, 'missingproject1', new Date())).toBeNull()
  })
})
