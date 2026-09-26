import { describe, expect, it, vi } from 'vitest'
import {
  TRANSITIONS,
} from '@/features/conversations/server/state-machine'
import { buildBaseTools } from '@/integrations/ai/tools/base.server'
import { buildBookingTools } from '@/integrations/ai/tools/booking'
import {
  buildDynamicSystemPrompt,
} from '@/integrations/ai/prompts'
import {
  processStalledConversations,
  processExpiredLeads,
  LEAD_INACTIVITY_EXPIRY_DAYS,
} from '@/features/lifecycle/server/lifecycle-service'

// Sending + marking stalled_nudge_sent now happens inside the BullMQ conversation-turn worker,
// not synchronously in processStalledConversations — mocking avoids a real Redis connection
// during this test and lets it assert what actually happens here: the right job gets enqueued.
const enqueueLifecycleMessage = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/queue/conversation-turn-queue', () => ({
  enqueueLifecycleMessage: (...args: unknown[]) => enqueueLifecycleMessage(...args),
}))

// Opening the project is covered against a real PocketBase in tests/integration/project-booking.test.ts.
const ensureInquiryProject = vi.fn().mockResolvedValue('project1')
vi.mock('@/features/projects/server/inquiry-project.server', () => ({
  ensureInquiryProject: (...args: unknown[]) => ensureInquiryProject(...args),
}))

describe('Cluster 6: State Machine', () => {
  describe('TRANSITIONS', () => {
    it('supports WANTS_TO_BOOK, WAITLIST, and AWAIT_HEALTH_NOTICE legal transitions', () => {
      expect(TRANSITIONS.NEW).toContain('WANTS_TO_BOOK')
      expect(TRANSITIONS.WANTS_TO_BOOK).toContain('COLLECTING_INFO')
      expect(TRANSITIONS.WANTS_TO_BOOK).toContain('AWAIT_PRICE_OFFER')
      expect(TRANSITIONS.WANTS_TO_BOOK).toContain('WAITLIST')
      expect(TRANSITIONS.COLLECTING_INFO).toContain('WAITLIST')
      expect(TRANSITIONS.WAITLIST).toContain('WANTS_TO_BOOK')
      expect(TRANSITIONS.WAITLIST).toContain('COLLECTING_INFO')
      expect(TRANSITIONS.WAITLIST).toContain('AWAIT_PAYMENT')
      expect(TRANSITIONS.AWAIT_PRICE_OFFER).toContain('AWAIT_HEALTH_NOTICE')
      expect(TRANSITIONS.AWAIT_HEALTH_NOTICE).toContain('AWAIT_PAYMENT')
      expect(TRANSITIONS.AWAIT_HEALTH_NOTICE).toContain('AWAITING_APPOINTMENT')
      expect(TRANSITIONS.AWAITING_APPOINTMENT).toContain('WANTS_TO_BOOK')
      expect(TRANSITIONS.COMPLETED).toContain('WANTS_TO_BOOK')
    })

    it('allows staff manual override directly to AWAITING_APPOINTMENT (Bug 45)', () => {
      expect(TRANSITIONS.AWAIT_PRICE_OFFER).toContain('AWAITING_APPOINTMENT')
      expect(TRANSITIONS.AWAIT_PAYMENT).toContain('AWAITING_APPOINTMENT')
      expect(TRANSITIONS.AWAIT_FINAL_CONFIRMATION).toContain('AWAITING_APPOINTMENT')
    })

  })

  describe('start_booking and Bug 19: wiping tattoo_info for returning clients', () => {
    it('start_booking transitions to WANTS_TO_BOOK and wipes tattoo_info: null', async () => {
      let transitionedTo: string | null = null
      let extraPassed: Record<string, unknown> | null = null

      const ctx: any = {
        su: {},
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'NEW',
        transitionState: async (to: string, opts: any) => {
          transitionedTo = to
          extraPassed = opts.extraFields
        },
        botTool: (_desc: string, schema: any, handler: any) => ({
          description: _desc,
          parameters: schema,
          execute: handler,
        }),
      }

      const tools = buildBaseTools(ctx)
      expect(tools.start_booking).toBeDefined()

      const res = await (tools.start_booking as any).execute({})
      expect(res.status).toBe('success')
      expect(transitionedTo).toBe('WANTS_TO_BOOK')
      expect(extraPassed).toEqual({ tattoo_info: null })
      expect(ensureInquiryProject).toHaveBeenCalledWith(ctx.su, 'conv1', 'cust1', 'new')
    })

    it('start_booking rejects execution if conversation is already mid-funnel', async () => {
      const ctx: any = {
        su: {},
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'COLLECTING_INFO',
        transitionState: async () => {},
        botTool: (_desc: string, schema: any, handler: any) => ({
          description: _desc,
          parameters: schema,
          execute: handler,
        }),
      }

      const tools = buildBaseTools(ctx)
      const res = await (tools.start_booking as any).execute({})
      expect(res.status).toBe('error')
    })
  })

  describe('join_waitlist tool', () => {
    it('registers client to waitlist and transitions to WAITLIST', async () => {
      let transitionedTo: string | null = null
      let waitlistRecordCreated: any = null

      const su = {
        collection: (name: string) => ({
          getFirstListItem: async () => {
            throw new Error('Not found')
          },
          getFullList: async () => [],
          create: async (data: any) => {
            if (name === 'waitlist_entries') {
              waitlistRecordCreated = data
            }
            return { id: 'wl_1', ...data }
          },
        }),
      }

      const ctx: any = {
        su,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'COLLECTING_INFO',
        transitionState: async (to: string) => {
          transitionedTo = to
        },
        botTool: (_desc: string, schema: any, handler: any) => ({
          description: _desc,
          parameters: schema,
          execute: handler,
        }),
      }

      const tools = buildBookingTools(ctx)
      expect(tools.join_waitlist).toBeDefined()

      const res = await (tools.join_waitlist as any).execute({
        staffId: 'staff_123',
        preferredDate: '2026-10-15',
        notes: 'שישי בבוקר עדיף',
      })

      expect(res.status).toBe('success')
      expect(transitionedTo).toBe('WAITLIST')
      expect(waitlistRecordCreated).toMatchObject({
        customer: 'cust1',
        preferred_staff: 'staff_123',
        status: 'watching',
        source: 'ai_bot',
        notes: 'שישי בבוקר עדיף',
      })
    })
  })

  describe('Bug 44: Cancellation recovery to COLLECTING_INFO', () => {
    it('request_cancel on pending hold transitions to COLLECTING_INFO with tattoo_info: null', async () => {
      let transitionedTo: string | null = null
      let extraPassed: any = null

      const su = {
        collection: (_name: string) => ({
          getFullList: async () => [
            { id: 'appt_pending', status: 'pending', start_time: '2026-10-10T10:00:00Z' },
          ],
          update: async () => ({}),
        }),
      }

      const ctx: any = {
        su,
        conversationId: 'conv1',
        customerId: 'cust1',
        conversationState: 'AWAIT_PRICE_OFFER',
        transitionState: async (to: string, opts: any) => {
          transitionedTo = to
          extraPassed = opts.extraFields
        },
        notifyStaff: async () => {},
        botTool: (_desc: string, schema: any, handler: any) => ({
          description: _desc,
          parameters: schema,
          execute: handler,
        }),
      }

      const tools = buildBookingTools(ctx)
      const res = await (tools.request_cancel as any).execute({})
      expect(res.status).toBe('success')
      expect(transitionedTo).toBe('COLLECTING_INFO')
      expect(extraPassed).toEqual({ tattoo_info: null })
    })
  })

  describe('Bug 47: Dynamic Prompt Context with Tattoo Description & Returning Customer Info', () => {
    it('injects tattoo description and artist into prompt for single active appointment', () => {
      const prompt = buildDynamicSystemPrompt({
        activeAppointments: [
          {
            id: 'appt1',
            date: '2026-09-20',
            timeSlot: '14:00',
            kind: 'session',
            artistName: 'רואי',
            status: 'confirmed',
            tattooDescription: 'דרקון יפני שחור על האמה',
          },
        ],
        customerName: 'יוסי כהן',
      })

      expect(prompt).toContain('יוסי כהן')
      expect(prompt).toContain('רואי')
      expect(prompt).toContain('2026-09-20')
      expect(prompt).toContain('14:00')
      expect(prompt).toContain('דרקון יפני שחור על האמה')
    })

    it('injects warm returning customer history', () => {
      const prompt = buildDynamicSystemPrompt({
        customerName: 'דנה',
        returningCustomerInfo: {
          pastAppointmentsCount: 2,
          lastArtistName: 'איתי',
          lastTattooDescription: 'פרח לוטוס עדין',
        },
      })

      expect(prompt).toContain('לקוח חוזר')
      expect(prompt).toContain('2 תורים')
      expect(prompt).toContain('איתי')
      expect(prompt).toContain('פרח לוטוס עדין')
      expect(prompt).toContain('אל תשאל מה שמו')
    })
  })

  describe('Lifecycle Nudge (20 Hours) and Stalled Lead Expiry (7 Days)', () => {
    it('hardcodes LEAD_INACTIVITY_EXPIRY_DAYS to 7', () => {
      expect(LEAD_INACTIVITY_EXPIRY_DAYS).toBe(7)
    })

    it('processStalledConversations nudges at 20 hours (within Meta 24h window)', async () => {
      const now = new Date('2026-09-20T12:00:00Z')
      const exactly20hAgo = new Date(now.getTime() - 20.5 * 60 * 60 * 1000).toISOString()
      const tooOld25hAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString()
      const tooYoung5hAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString()

      const convs = [
        {
          id: 'c1',
          state: 'WANTS_TO_BOOK',
          last_message_at: exactly20hAgo,
          tattoo_info: {},
          expand: { customer: { id: 'cust1', phone: '0501111111', name: 'אבי' } },
        },
        {
          id: 'c2',
          state: 'COLLECTING_INFO',
          last_message_at: tooOld25hAgo, // missed 24h window
          tattoo_info: {},
          expand: { customer: { id: 'cust2', phone: '0502222222', name: 'בני' } },
        },
        {
          id: 'c3',
          state: 'COLLECTING_INFO',
          last_message_at: tooYoung5hAgo, // too soon
          tattoo_info: {},
          expand: { customer: { id: 'cust3', phone: '0503333333', name: 'גדי' } },
        },
      ]

      const updatedIds: string[] = []
      const su = {
        collection: (_name: string) => ({
          getFullList: async () => convs,
          update: async (id: string) => {
            updatedIds.push(id)
            return {}
          },
          getFirstListItem: async () => null,
          create: async () => ({}),
        }),
      }

      const nudged = await processStalledConversations(su as never, now)
      expect(nudged).toBe(1)
      expect(enqueueLifecycleMessage).toHaveBeenCalledTimes(1)
      expect(enqueueLifecycleMessage.mock.calls[0]![0].onSuccess).toEqual({ kind: 'stalled_nudge', conversationId: 'c1' })
      expect(updatedIds).not.toContain('c2')
      expect(updatedIds).not.toContain('c3')
    })

    it('processExpiredLeads closes the conversation of a lead inactive for 7 days with nothing booked', async () => {
      const now = new Date('2026-09-20T12:00:00Z')
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const conversations: Record<string, { id: string; state: string; customer: string; last_message_at: string }> = {
        conv_exp: { id: 'conv_exp', state: 'COLLECTING_INFO', customer: 'c_expired', last_message_at: eightDaysAgo },
        conv_act: { id: 'conv_act', state: 'COLLECTING_INFO', customer: 'c_active', last_message_at: twoDaysAgo },
      }

      let listFilter = ''
      const updates: Array<{ id: string; fields: Record<string, unknown> }> = []
      const su = {
        filter: (raw: string) => raw,
        collection: (name: string) => ({
          getFullList: async (opts: { filter: string }) => {
            listFilter = opts.filter
            return Object.values(conversations)
          },
          getList: async () => ({ totalItems: 0 }), // nothing booked
          getOne: async (id: string) => conversations[id] ?? { id },
          update: async (id: string, fields: Record<string, unknown>) => {
            if (name === 'conversations') updates.push({ id, fields })
            return fields
          },
          create: async () => ({}),
        }),
      }

      expect(await processExpiredLeads(su as never, now)).toBe(1)
      expect(updates).toEqual([{ id: 'conv_exp', fields: expect.objectContaining({ state: 'COMPLETED', status: 'closed' }) }])
      // A customer between sessions or asked for feedback isn't a lead going cold.
      expect(listFilter).toContain("state != 'PROJECT_IN_PROGRESS'")
      expect(listFilter).toContain("state != 'AWAIT_NPS_SCORE'")
    })
  })
})
