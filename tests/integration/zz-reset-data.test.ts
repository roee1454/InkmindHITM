import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { createAppointment, createConversation, createCustomer, createStaff, exists, superuserClient } from './helpers/pocketbase'

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({ deleteGoogleCalendarEvent: vi.fn() }))
const { resetData } = await import('@/features/database/server/reset-data.server')

// These wipe the PocketBase every integration file shares, so this file is named to run last (files
// run in order, one at a time). Records other files left on purpose to fail a delete (the test-only
// failpoints) can survive a reset, so the assertions look at this test's own records, not at totals.
let pb: PocketBase

beforeAll(async () => {
  pb = await superuserClient()
})

describe('resetData', () => {
  it('empties customers, projects, appointments and their conversations, even with upcoming appointments, and keeps staff', async () => {
    const staff = await createStaff(pb)
    const customer = await createCustomer(pb)
    const { conversation } = await createConversation(pb, customer.id, { messageBodies: ['hi'] })
    const upcoming = await createAppointment(pb, { customer: customer.id, staff: staff.id, startsInHours: 48, status: 'confirmed' })
    const past = await createAppointment(pb, { customer: customer.id, staff: staff.id, startsInHours: -48, status: 'completed' })

    const result = await resetData(pb, 'work')

        expect(result.deleted.customers).toBeGreaterThanOrEqual(1)
    for (const [collection, id] of [['customers', customer.id], ['conversations', conversation.id], ['appointments', upcoming.id], ['appointments', past.id]] as const) {
      expect(await exists(pb, collection, id)).toBe(false)
    }
        expect(await exists(pb, 'staff', staff.id)).toBe(true)
  })

  it('business: also clears activity outside the work, but keeps staff and the studio setup', async () => {
    const staff = await createStaff(pb)
    await pb.collection('notifications').create({ title: 'x', message: 'y', type: 'info', read: false })
    await pb.collection('faq').create({ question: 'q', answer: 'a' }).catch(() => null)
    const customer = await createCustomer(pb)

    const result = await resetData(pb, 'business')

        expect(await exists(pb, 'customers', customer.id)).toBe(false)
    expect(result.deleted.notifications).toBeGreaterThanOrEqual(1)
    expect(await exists(pb, 'staff', staff.id)).toBe(true)
  })

  it('everything: removes staff too', async () => {
    const staff = await createStaff(pb)
    const customer = await createCustomer(pb)

    const result = await resetData(pb, 'everything')

        expect(await exists(pb, 'staff', staff.id)).toBe(false)
    expect(await exists(pb, 'customers', customer.id)).toBe(false)
    expect(result.deleted.staff).toBeGreaterThanOrEqual(1)
    expect(result.remaining.staff).toBeUndefined()
    expect(result.remaining.customers).toBeUndefined()
  })
})
