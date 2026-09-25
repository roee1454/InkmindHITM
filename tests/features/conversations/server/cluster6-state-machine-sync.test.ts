import { describe, expect, it, vi } from 'vitest'
import {
  TRANSITIONS,
  transition,
  stateToLeadStage,
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

describe('Cluster 6: State Machine & Lead Stage Sync', () => {
  describe('TRANSITIONS and stateToLeadStage', () => {
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

    it('maps every conversation state to a 1:1 identical CRM lead_stage', () => {
      expect(stateToLeadStage('NEW')).toBe('NEW')
      expect(stateToLeadStage('WANTS_TO_BOOK')).toBe('WANTS_TO_BOOK')
      expect(stateToLeadStage('COLLECTING_INFO')).toBe('COLLECTING_INFO')
      expect(stateToLeadStage('WAITLIST')).toBe('WAITLIST')
      expect(stateToLeadStage('AWAIT_PRICE_OFFER')).toBe('AWAIT_PRICE_OFFER')
      expect(stateToLeadStage('AWAIT_HEALTH_NOTICE')).toBe('AWAIT_HEALTH_NOTICE')
      expect(stateToLeadStage('AWAIT_PAYMENT')).toBe('AWAIT_PAYMENT')
      expect(stateToLeadStage('AWAIT_FINAL_CONFIRMATION')).toBe('AWAIT_FINAL_CONFIRMATION')
      expect(stateToLeadStage('AWAITING_APPOINTMENT')).toBe('AWAITING_APPOINTMENT')
      expect(stateToLeadStage('AWAIT_NPS_SCORE')).toBe('AWAIT_NPS_SCORE')
      expect(stateToLeadStage('COMPLETED')).toBe('COMPLETED')
    })

    it('transition() synchronizes customer.lead_stage automatically (Bug 43)', async () => {
      let customerStage = 'NEW'
      const su = {
        collection: (name: string) => ({
          getOne: async (id: string) => {
            if (name === 'conversations') return { id: 'conv1', state: 'NEW', customer: 'cust1' }
            if (name === 'customers') return { id: 'cust1', lead_stage: customerStage }
            return { id }
          },
          update: async (_id: string, fields: Record<string, unknown>) => {
            if (name === 'customers' && 'lead_stage' in fields) {
              customerStage = fields.lead_stage as string
            }
            return fields
          },
          create: async (fields: Record<string, unknown>) => fields,
        }),
      }

      // 1. Move to WANTS_TO_BOOK
      await transition(su as never, 'conv1', 'WANTS_TO_BOOK', { actor: 'bot', reason: 'start_booking' })
      expect(customerStage).toBe('WANTS_TO_BOOK')

      // 2. Move to COLLECTING_INFO
      su.collection = (name: string) => ({
        getOne: async (id: string) => {
          if (name === 'conversations') return { id: 'conv1', state: 'WANTS_TO_BOOK', customer: 'cust1' }
          if (name === 'customers') return { id: 'cust1', lead_stage: customerStage }
          return { id }
        },
        update: async (_id: string, fields: Record<string, unknown>) => {
          if (name === 'customers' && 'lead_stage' in fields) {
            customerStage = fields.lead_stage as string
          }
          return fields
        },
        create: async (fields: Record<string, unknown>) => fields,
      })
      await transition(su as never, 'conv1', 'COLLECTING_INFO', { actor: 'bot', reason: 'route_chosen' })
      expect(customerStage).toBe('COLLECTING_INFO')
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
            type: 'tattoo',
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

    it('processExpiredLeads expires leads inactive for 7 days with no future appointments', async () => {
      const now = new Date('2026-09-20T12:00:00Z')
      const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()

      const customers = [
        { id: 'c_expired', lead_stage: 'COLLECTING_INFO', updated: eightDaysAgo },
        { id: 'c_active', lead_stage: 'COLLECTING_INFO', updated: twoDaysAgo },
      ]

      const updatedCustomers: Array<{ id: string; stage: string }> = []
      const su = {
        collection: (name: string) => ({
          getFullList: async () => customers,
          getList: async () => ({ totalItems: 0 }), // no active appointments
          getFirstListItem: async (filter: string) => {
            if (filter.includes('c_expired')) {
              return { id: 'conv_exp', state: 'COLLECTING_INFO', customer: 'c_expired', last_message_at: eightDaysAgo }
            }
            return { id: 'conv_act', state: 'COLLECTING_INFO', customer: 'c_active', last_message_at: twoDaysAgo }
          },
          update: async (id: string, fields: any) => {
            if (name === 'customers' && fields.lead_stage) {
              updatedCustomers.push({ id, stage: fields.lead_stage })
            }
            return fields
          },
          getOne: async (id: string) => {
            if (name === 'conversations') return { id, state: 'COLLECTING_INFO', customer: 'c_expired' }
            if (name === 'customers') return { id, lead_stage: 'COMPLETED' }
            return { id }
          },
          create: async () => ({}),
        }),
      }

      const expiredCount = await processExpiredLeads(su as never, now)
      expect(expiredCount).toBe(1)
      expect(updatedCustomers).toEqual([{ id: 'c_expired', stage: 'COMPLETED' }])
    })
  })
})

