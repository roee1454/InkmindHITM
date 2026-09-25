import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createPendingHoldForBot } from '@/features/calendar/server/bot-appointments.server'
import { handleGetActiveAppointmentSummary } from '@/features/conversations/server/messages.server'
import type PocketBase from 'pocketbase'

vi.mock('@/lib/async-lock', () => ({
  bookingLock: {
    runExclusive: vi.fn((_key, fn) => fn()),
  },
}))

vi.mock('@/features/settings/server/closures', () => ({
  isStudioClosedOn: vi.fn().mockResolvedValue({ closed: false }),
}))

vi.mock('@/features/settings/server/profiles', () => ({
  getWorkingHoursForStaff: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/integrations/google-calendar/server/google-sync.server', () => ({
  syncAppointmentToGoogle: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/integrations/google-calendar/server/google-auth.server', () => ({
  getGoogleCalendarBusyIntervals: vi.fn().mockResolvedValue([]),
  getGoogleCalendarEvents: vi.fn().mockResolvedValue([]),
  filterGoogleBusyIntervalsForDay: vi.fn().mockReturnValue([]),
}))

vi.mock('@/features/mcp-assistant/server/waitlist-matcher', () => ({
  runWaitlistMatching: vi.fn().mockResolvedValue(undefined),
}))

describe('Multi-Appointment & Media Scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createPendingHoldForBot excludes inspiration images sent before booking_session_started_at', async () => {
    const sessionStart = '2026-09-18T14:00:00.000Z'
    const oldMsgTimestamp = '2026-09-18T10:00:00.000Z'
    const newMsgTimestamp = '2026-09-18T15:00:00.000Z'

    const capturedFilters: string[] = []
    let createdPayload: Record<string, unknown> | null = null
    const conversationUpdate = vi.fn().mockResolvedValue({})

    const mockSu = {
      collection: (name: string) => {
        if (name === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: 'staff_1', name: 'Alon' }),
          }
        }
        if (name === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_1',
              customer: 'cust_1',
              booking_session_started_at: sessionStart,
              active_project: 'proj_consultation',
            }),
            update: conversationUpdate,
          }
        }
        if (name === 'appointments') {
          return {
            getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
            getFullList: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockImplementation((payload) => {
              createdPayload = payload
              return Promise.resolve({ id: 'apt_new', ...payload })
            }),
          }
        }
        if (name === 'messages') {
          return {
            getFullList: vi.fn().mockImplementation(({ filter }) => {
              capturedFilters.push(filter)
              // Only return messages after sessionStart
              if (filter.includes(sessionStart)) {
                return Promise.resolve([
                  {
                    id: 'msg_new',
                    media: 'new_tattoo_ref.jpg',
                    timestamp: newMsgTimestamp,
                    appointment: null,
                  },
                ])
              }
              return Promise.resolve([
                {
                  id: 'msg_old',
                  media: 'old_sketch_ref.jpg',
                  timestamp: oldMsgTimestamp,
                  appointment: null,
                },
                {
                  id: 'msg_new',
                  media: 'new_tattoo_ref.jpg',
                  timestamp: newMsgTimestamp,
                  appointment: null,
                },
              ])
            }),
            update: vi.fn().mockResolvedValue({}),
          }
        }
        return {}
      },
    } as unknown as PocketBase

    const result = await createPendingHoldForBot(mockSu, {
      customerId: 'cust_1',
      staffId: 'staff_1',
      date: '2026-10-01',
      timeSlot: '14:00',
      durationHours: 2,
      tattooDescription: 'New Dragon Tattoo',
      type: 'tattoo',
      allowException: true,
    })

    expect(result.status).toBe('created')
    expect(capturedFilters.some((f) => f.includes(`timestamp >= "${sessionStart}"`))).toBe(true)
    expect(createdPayload).not.toBeNull()
    const refImages = (createdPayload as any)?.reference_images as string[]
    expect(refImages).toHaveLength(1)
    expect(refImages[0]).toContain('new_tattoo_ref.jpg')
    expect(refImages[0]).not.toContain('old_sketch_ref.jpg')
    // The hold is booked inside the project the conversation is already working on.
    expect((createdPayload as any)?.project).toBe('proj_consultation')
  })

  it('handleGetActiveAppointmentSummary returns paymentReceiptUrl and createdAt from the active appointment', async () => {
    const mockSu = {
      collection: (name: string) => {
        if (name === 'conversations') {
          return {
            getOne: vi.fn().mockResolvedValue({
              id: 'conv_1',
              customer: 'cust_1',
            }),
          }
        }
        if (name === 'appointments') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'apt_active',
              customer: 'cust_1',
              staff: 'staff_1',
              status: 'pending',
              type: 'tattoo',
              tattoo_description: 'Snake arm',
              start_time: '2026-10-05T12:00:00.000Z',
              duration_minutes: 120,
              deposit_amount: 250,
              deposit_paid: false,
              slot_confirmed: false,
              payment_receipt_url: 'http://127.0.0.1:8090/api/files/messages/msg_receipt/receipt.png',
              reference_images: ['http://127.0.0.1:8090/api/files/messages/msg_ref/ref.png'],
              created: '2026-09-18T15:30:00.000Z',
            }),
          }
        }
        if (name === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: 'staff_1', name: 'Maya' }),
          }
        }
        if (name === 'customers') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: 'cust_1', name: 'Dan' }),
          }
        }
        return {}
      },
    } as unknown as PocketBase

    const summary = await handleGetActiveAppointmentSummary({ conversationId: 'conv_1' }, mockSu)

    expect(summary).not.toBeNull()
    expect(summary?.id).toBe('apt_active')
    expect(summary?.paymentReceiptUrl).toBe('http://127.0.0.1:8090/api/files/messages/msg_receipt/receipt.png')
    expect(summary?.referenceImages).toEqual(['http://127.0.0.1:8090/api/files/messages/msg_ref/ref.png'])
    expect(summary?.createdAt).toBe('2026-09-18T15:30:00.000Z')
  })
})
