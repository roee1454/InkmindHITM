import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { createAppointment, createConversation, createCustomer, createStaff, exists, superuserClient } from './helpers/pocketbase'

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({ deleteGoogleCalendarEvent: vi.fn() }))
const { resetStudioData } = await import('@/features/database/server/reset-studio-data.server')

let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

describe('resetStudioData', () => {
  it('empties customers, projects, appointments and their conversations, even with upcoming appointments, and keeps staff', async () => {
    const staff = await createStaff(pb)
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['hi'] })
    const upcoming = await createAppointment(pb, { customer: customer.id, staff: staff.id, startsInHours: 48, status: 'confirmed' })
    const past = await createAppointment(pb, { customer: customer.id, staff: staff.id, startsInHours: -48, status: 'completed' })

    const result = await resetStudioData(pb)

    expect(result.failed).toBe(0)
    expect(result.deleted.customers).toBeGreaterThanOrEqual(1)
    for (const [collection, id] of [['customers', customer.id], ['conversations', conversation.id], ['appointments', upcoming.id], ['appointments', past.id]] as const) {
      expect(await exists(pb, collection, id)).toBe(false)
    }
    expect((await pb.collection('projects').getList(1, 1)).totalItems).toBe(0)
    expect(await exists(pb, 'staff', staff.id)).toBe(true)
  })
})
