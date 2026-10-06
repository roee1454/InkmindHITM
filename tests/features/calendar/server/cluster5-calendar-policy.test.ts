import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createPendingHoldForBot,
  getActiveAppointmentForBot,
  getActiveAppointmentsForBot,
  checkAvailabilityForBot,
} from '@/features/calendar/server/bot-appointments.server'
import { getStudioPolicyForBot } from '@/features/settings/server/policy'
import { suggestArtistsForBot } from '@/features/settings/server/profiles'
import { buildBookingTools } from '@/integrations/ai/tools/booking'

vi.mock('@/integrations/google-calendar/server/google-sync.server', () => ({
  syncAppointmentToGoogle: vi.fn().mockResolvedValue(undefined),
  getGoogleCalendarBusyIntervals: vi.fn().mockResolvedValue([]),
  getGoogleCalendarEvents: vi.fn().mockResolvedValue([]),
  filterGoogleBusyIntervalsForDay: vi.fn().mockReturnValue([]),
}))

vi.mock('@/features/mcp-assistant/server/waitlist-matcher', () => ({
  runWaitlistMatching: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn().mockResolvedValue({ staff: { id: 'staff1', role: 'admin' } }),
  requireAdmin: vi.fn().mockResolvedValue({ staff: { id: 'staff1', role: 'admin' } }),
}))

vi.mock('@/lib/session.server', () => ({
  getSession: vi.fn().mockResolvedValue({ staff: { id: 'staff1', role: 'admin' } }),
}))

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue({
    phoneNumberId: 'phone_123',
    accessToken: 'token_123',
  }),
}))

vi.mock('@/integrations/whatsapp-cloud-api/client', () => ({
  createWhatsAppClient: vi.fn().mockReturnValue({
    sendText: vi.fn().mockResolvedValue({ wamid: 'wam_test_123' }),
  }),
}))

describe('Cluster 5: Calendar Tools, Working Hours, Shifts & Cancellation Policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bug 20: 0-Hour Cancellation Cutoff Support', () => {
    it('preserves cancellationCutoffHours: 0 when configured in DB', async () => {
      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getList: vi.fn().mockResolvedValue({
            items: [
              {
                cancellation_cutoff_hours: 0,
                deposit_required: true,
                deposit_amount: 150,
              },
            ],
          }),
        }),
      } as any

      const policy = await getStudioPolicyForBot(mockSu)
      expect(policy.cancellationCutoffHours).toBe(0)
    })

    it('falls back to 48 hours only when cancellation_cutoff_hours is undefined/null', async () => {
      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getList: vi.fn().mockResolvedValue({
            items: [{}],
          }),
        }),
      } as any

      const policy = await getStudioPolicyForBot(mockSu)
      expect(policy.cancellationCutoffHours).toBe(48)
    })
  })

  describe('Bug 16: Deleted/Orphaned Staff Filtering in suggestArtistsForBot', () => {
    it('filters out staff records that have an empty name', async () => {
      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getFullList: vi.fn().mockResolvedValue([
            {
              id: 'staff1',
              name: 'דור המקעקע',
              role: 'owner',
              bio: 'Real Artist',
            },
            {
              id: 'staff2',
              name: '',
              role: 'staff',
              bio: 'Empty staff profile',
            },
            {
              id: 'staff3',
              name: '   ',
              role: 'staff',
              bio: 'Whitespace staff profile',
            },
          ]),
        }),
      } as any

      const result = await suggestArtistsForBot(mockSu, {})
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('דור המקעקע')
      expect(result.some((r) => r.name === 'מקעקע/ת')).toBe(false)
    })
  })

  describe('Bug 9: Pending Hold Leak Prevention & Waitlist Triggering', () => {
    it('cleans up prior pending holds using cancelAppointmentForBot to trigger waitlist matching', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'old_hold' })
      const mockCreate = vi.fn().mockResolvedValue({ id: 'new_hold' })
      const mockGetOne = vi.fn().mockResolvedValue({ id: 'staff1' })
      const mockGetFirstListItem = vi.fn().mockRejectedValue(new Error('Not found'))
      const mockGetFullList = vi.fn((opts) => {
        if (opts?.filter?.includes('status = "pending"')) {
          return Promise.resolve([
            {
              id: 'old_hold_1',
              customer: 'cust1',
              staff: 'staff1',
              start_time: '2026-10-10T10:00:00.000Z',
              duration_minutes: 120,
              status: 'pending',
            },
          ])
        }
        if (opts?.filter?.includes('waitlist_entries')) {
          return Promise.resolve([])
        }
        return Promise.resolve([])
      })

      const mockSu = {
        collection: vi.fn((_col) => ({
          getOne: mockGetOne,
          getFirstListItem: mockGetFirstListItem,
          getFullList: mockGetFullList,
          getList: vi.fn().mockResolvedValue({ items: [] }),
          update: mockUpdate,
          create: mockCreate,
        })),
      } as any

      const res = await createPendingHoldForBot(mockSu, {
        customerId: 'cust1',
        staffId: 'staff1',
        date: '2026-10-15',
        timeSlot: '14:00',
        durationHours: 2,
        tattooDescription: 'Dragon tattoo',
      })

      expect(res.status).toBe('created')
      expect(mockUpdate).toHaveBeenCalledWith('old_hold_1', {
        status: 'cancelled',
        status_actor: 'bot',
        status_reason: 'hold_replaced',
        cancelled_by: 'system',
      })
    })
  })

  describe('Bug 10: Multi-Appointment Disambiguation', () => {
    it('getActiveAppointmentsForBot returns all active upcoming appointments', async () => {
      const mockAppointments = [
        { id: 'appt1', start_time: '2026-10-01T10:00:00.000Z', type: 'sketch', status: 'confirmed' },
        { id: 'appt2', start_time: '2026-10-10T12:00:00.000Z', type: 'tattoo', status: 'confirmed' },
      ]

      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getFullList: vi.fn().mockResolvedValue(mockAppointments),
        }),
      } as any

      const results = await getActiveAppointmentsForBot(mockSu, 'cust1')
      expect(results).toHaveLength(2)
      expect(results[0]?.id).toBe('appt1')
      expect(results[1]?.id).toBe('appt2')
    })

    it('getActiveAppointmentForBot retrieves specific appointment when appointmentId is provided', async () => {
      const specificAppt = {
        id: 'appt2',
        customer: 'cust1',
        start_time: '2026-10-10T12:00:00.000Z',
        type: 'tattoo',
        status: 'confirmed',
      }

      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getOne: vi.fn().mockResolvedValue(specificAppt),
        }),
      } as any

      const res = await getActiveAppointmentForBot(mockSu, 'cust1', 'appt2')
      expect(res?.id).toBe('appt2')
    })

    it('request_cancel prompts clarification if customer has multiple appointments and none specified', async () => {
      const mockAppointments = [
        { id: 'appt1', start_time: '2026-10-01T10:00:00.000Z', type: 'sketch', status: 'confirmed' },
        { id: 'appt2', start_time: '2026-10-10T12:00:00.000Z', type: 'tattoo', status: 'confirmed' },
      ]

      const mockSu = {
        collection: vi.fn().mockReturnValue({
          getFullList: vi.fn().mockResolvedValue(mockAppointments),
        }),
      } as any

      const tools = buildBookingTools({
        su: mockSu,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAITING_APPOINTMENT',
        updateConversation: vi.fn().mockResolvedValue({}),
        transitionState: vi.fn().mockResolvedValue({}),
        notifyStaff: vi.fn().mockResolvedValue({}),
        botTool: (_desc: string, schema: any, handler: any) => ({ schema, execute: handler } as any),
      })

      const cancelTool = tools.request_cancel as any
      const result = await cancelTool.execute({ details: 'רוצה לבטל' })
      expect(result.status).toBe('clarification_needed')
      expect(result.message).toContain('ללקוח יש מספר תורים עתידיים פעילים')
    })
  })

  describe('Bug 11 & 12 + Studio Cancellation Rules (168h Rule & Human Override)', () => {
    it('Bug 12: pending hold cancels immediately without 48h cutoff and without deposit forfeiture warning', async () => {
      const mockPendingAppt = {
        id: 'hold_1',
        customer: 'cust1',
        start_time: new Date(Date.now() + 10 * 3600 * 1000).toISOString(), // in 10 hours (inside 48h window)
        status: 'pending',
        type: 'tattoo',
      }

      const mockUpdate = vi.fn().mockResolvedValue({})
      const mockTransition = vi.fn().mockResolvedValue({})
      const mockNotify = vi.fn().mockResolvedValue({})

      const mockSu = {
        collection: vi.fn((_col) => ({
          getFullList: vi.fn().mockResolvedValue([mockPendingAppt]),
          update: mockUpdate,
        })),
      } as any

      const tools = buildBookingTools({
        su: mockSu,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAIT_PRICE_OFFER',
        updateConversation: vi.fn().mockResolvedValue({}),
        transitionState: mockTransition,
        notifyStaff: mockNotify,
        botTool: (_desc: string, schema: any, handler: any) => ({ schema, execute: handler } as any),
      })

      const cancelTool = tools.request_cancel as any
      const result = await cancelTool.execute({ appointmentId: 'hold_1', details: 'שיניתי את דעתי' })

      expect(result.status).toBe('success')
      expect(result.message).toContain('ההחזקה הזמנית שוחררה בהצלחה')
      expect(result.message).not.toContain('מקדמה')
      expect(mockTransition).toHaveBeenCalledWith('COLLECTING_INFO', expect.anything())
    })

    it('Confirmed appointment less than cutoff hours (< 48h) escalates to staff with non-refundable deposit notice', async () => {
      const mockConfirmedAppt = {
        id: 'confirmed_short_notice',
        customer: 'cust1',
        start_time: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24 hours away (< 48h)
        status: 'confirmed',
        deposit_paid: true,
        deposit_amount: 200,
      }

      const mockUpdateConversation = vi.fn().mockResolvedValue({})
      const mockNotifyStaff = vi.fn().mockResolvedValue({})

      const mockSu = {
        collection: vi.fn((col) => {
          if (col === 'settings') {
            return {
              getList: vi.fn().mockResolvedValue({
                items: [{ cancellation_cutoff_hours: 48 }],
              }),
            }
          }
          return {
            getFullList: vi.fn().mockResolvedValue([mockConfirmedAppt]),
            update: vi.fn().mockResolvedValue({}),
          }
        }),
      } as any

      const tools = buildBookingTools({
        su: mockSu,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAITING_APPOINTMENT',
        updateConversation: mockUpdateConversation,
        transitionState: vi.fn().mockResolvedValue({}),
        notifyStaff: mockNotifyStaff,
        botTool: (_desc: string, schema: any, handler: any) => ({ schema, execute: handler } as any),
      })

      const cancelTool = tools.request_cancel as any
      const result = await cancelTool.execute({ appointmentId: 'confirmed_short_notice', details: 'חולה' })

      expect(result.status).toBe('handoff')
      expect(result.message).toContain('הביטול הוא בהתראה קצרה')
      // The bot never rules on the deposit itself; staff decide (src/lib/cancellation-policy.ts).
      expect(result.message).toContain('נציג הסטודיו יחזור אליו בנושא המקדמה')
      expect(result.message).not.toContain('אינה מוחזרת')
      expect(mockNotifyStaff).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('לפי המדיניות המקדמה אינה מוחזרת (לבדיקתך)'),
        'warning',
        expect.anything(),
      )
      expect(result.message).toContain('אל תגיד שהתור כבר בוטל בפועל')
      expect(mockUpdateConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'escalated',
          staff_call_reason: 'cancel_request',
        }),
      )
    })

    it('Confirmed appointment between cutoff (>= 48h) and 1 week (< 168h) cancels autonomously with non-refundable deposit notice', async () => {
      const mockConfirmedAppt = {
        id: 'confirmed_autonomous_under_week',
        customer: 'cust1',
        start_time: new Date(Date.now() + 72 * 3600 * 1000).toISOString(), // 3 days away (>= 48h, < 168h)
        status: 'confirmed',
        deposit_paid: true,
        deposit_amount: 200,
      }

      const mockUpdate = vi.fn().mockResolvedValue({})
      const mockNotifyStaff = vi.fn().mockResolvedValue({})
      const mockTransitionState = vi.fn().mockResolvedValue({})

      const mockSu = {
        collection: vi.fn((col) => {
          if (col === 'settings') {
            return {
              getList: vi.fn().mockResolvedValue({
                items: [{ cancellation_cutoff_hours: 48 }],
              }),
            }
          }
          return {
            // Once cancelled, the appointment is no longer among the customer's upcoming ones.
            getFullList: vi.fn(() => Promise.resolve(mockUpdate.mock.calls.length > 0 ? [] : [mockConfirmedAppt])),
            update: mockUpdate,
          }
        }),
      } as any

      const tools = buildBookingTools({
        su: mockSu,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAITING_APPOINTMENT',
        updateConversation: vi.fn().mockResolvedValue({}),
        transitionState: mockTransitionState,
        notifyStaff: mockNotifyStaff,
        botTool: (_desc: string, schema: any, handler: any) => ({ schema, execute: handler } as any),
      })

      const cancelTool = tools.request_cancel as any
      const result = await cancelTool.execute({ appointmentId: 'confirmed_autonomous_under_week', details: 'עניינים אישיים' })

      expect(result.status).toBe('success')
      expect(result.message).toContain('התור בוטל בהצלחה')
      expect(result.message).toContain('אל תקבע/י בעצמך אם היא מוחזרת או מחולטת')
      expect(result.message).not.toContain('אינה ניתנת להחזר')
      expect(mockTransitionState).toHaveBeenCalledWith('COMPLETED', expect.anything())
    })

    it('Confirmed appointment more than 1 week (>= 168h) cancels autonomously and notes deposit is subject to staff review', async () => {
      const mockConfirmedAppt = {
        id: 'confirmed_autonomous_over_week',
        customer: 'cust1',
        start_time: new Date(Date.now() + 200 * 3600 * 1000).toISOString(), // > 168h away
        status: 'confirmed',
        deposit_paid: true,
        deposit_amount: 200,
      }

      const mockUpdate = vi.fn().mockResolvedValue({})
      const mockNotifyStaff = vi.fn().mockResolvedValue({})
      const mockTransitionState = vi.fn().mockResolvedValue({})

      const mockSu = {
        collection: vi.fn((col) => {
          if (col === 'settings') {
            return {
              getList: vi.fn().mockResolvedValue({
                items: [{ cancellation_cutoff_hours: 48 }],
              }),
            }
          }
          return {
            // Once cancelled, the appointment is no longer among the customer's upcoming ones.
            getFullList: vi.fn(() => Promise.resolve(mockUpdate.mock.calls.length > 0 ? [] : [mockConfirmedAppt])),
            update: mockUpdate,
          }
        }),
      } as any

      const tools = buildBookingTools({
        su: mockSu,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAITING_APPOINTMENT',
        updateConversation: vi.fn().mockResolvedValue({}),
        transitionState: mockTransitionState,
        notifyStaff: mockNotifyStaff,
        botTool: (_desc: string, schema: any, handler: any) => ({ schema, execute: handler } as any),
      })

      const cancelTool = tools.request_cancel as any
      const result = await cancelTool.execute({ appointmentId: 'confirmed_autonomous_over_week', details: 'טס לחול' })

      expect(result.status).toBe('success')
      expect(result.message).toContain('התור בוטל בהצלחה')
      expect(result.message).toContain('נציג הסטודיו יחזור אליו בנושא המקדמה')
      expect(result.message).not.toContain('אינה ניתנת להחזר')
      expect(mockNotifyStaff).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('ביטול מעל שבוע מראש: המקדמה להסדרה מול הלקוח'),
        'info',
        expect.anything(),
      )
      expect(mockTransitionState).toHaveBeenCalledWith('COMPLETED', expect.anything())
    })
  })

  describe('Bugs 13, 14, 15: Split Shifts in Working Hours', () => {
    it('evaluates split shifts properly across morning and evening windows', async () => {
      // Staff works Sunday (day 0) 10:00-14:00 and 16:00-20:00
      const splitWindows = [
        { dayOfWeek: 0, startTime: '10:00', endTime: '14:00' },
        { dayOfWeek: 0, startTime: '16:00', endTime: '20:00' },
      ]

      const mockSu = {
        collection: vi.fn((col) => {
          if (col === 'staff') {
            return {
              getOne: vi.fn().mockResolvedValue({ id: 'staff_split', name: 'דור', work_hours: splitWindows }),
            }
          }
          return {
            getList: vi.fn().mockResolvedValue({ items: [] }),
            getFullList: vi.fn().mockResolvedValue([]),
          }
        }),
      } as any

      // 2026-10-11 is Sunday (dayOfWeek 0)
      // Slot 1: 17:00 (inside second split window) for 2 hours -> should be available
      const checkEvening = await checkAvailabilityForBot(mockSu, {
        staffId: 'staff_split',
        date: '2026-10-11',
        timeSlot: '17:00',
        durationHours: 2,
      })
      expect(checkEvening.available).toBe(true)

      // Slot 2: 13:30 (bridges across the 14:00-16:00 split gap) -> should be unavailable
      const checkBridging = await checkAvailabilityForBot(mockSu, {
        staffId: 'staff_split',
        date: '2026-10-11',
        timeSlot: '13:30',
        durationHours: 2,
      })
      expect(checkBridging.available).toBe(false)
      expect(checkBridging.reason).toBe('outside_working_hours')
    })
  })
})
