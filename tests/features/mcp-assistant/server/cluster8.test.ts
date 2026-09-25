import { describe, expect, it, vi, beforeEach } from 'vitest'
import { coalesceHistory } from '@/integrations/ai/agent.server'
import { commitMessagingAction } from '@/features/mcp-assistant/server/tool-servers/messaging.server'
import { commitCalendarAction } from '@/features/mcp-assistant/server/tool-servers/calendar.server'
import { getCompletedAppointmentAwaitingNpsForBot } from '@/features/calendar/server/bot-appointments.server'
import { handleUpdateAppointment } from '@/features/calendar/server/appointments.server'
import { buildDynamicSystemPrompt } from '@/integrations/ai/prompts'
import type { ModelMessage } from 'ai'

// Mock dependencies
const { mockRunWaitlistMatching, mockSendText } = vi.hoisted(() => ({
  mockRunWaitlistMatching: vi.fn().mockResolvedValue(undefined),
  mockSendText: vi.fn().mockResolvedValue({ wamid: 'wamid.test.123' }),
}))

vi.mock('@/features/mcp-assistant/server/waitlist-matcher', () => ({
  runWaitlistMatching: mockRunWaitlistMatching,
}))

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn().mockResolvedValue({ staff: { id: 'staff1', role: 'admin' } }),
}))

vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue({
    phoneNumberId: 'phone_123',
    accessToken: 'token_abc',
  }),
}))
vi.mock('@/integrations/whatsapp-cloud-api/client', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createWhatsAppClient: vi.fn(() => ({
      sendText: mockSendText,
    })),
  }
})

vi.mock('@/integrations/google-calendar/server/google-sync.server', () => ({
  syncAppointmentToGoogle: vi.fn().mockResolvedValue(undefined),
  deleteSyncedAppointmentFromGoogle: vi.fn().mockResolvedValue(undefined),
}))

const mockSu = {
  collection: vi.fn(),
}

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(() => Promise.resolve(mockSu)),
}))

describe('Cluster 8: MCP Assistant, Waitlist, and Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bug 48: coalesceHistory on MCP message turns', () => {
    it('merges consecutive owner/user messages to prevent Anthropic 400 alternating role error', () => {
      const rawMessages: ModelMessage[] = [
        { role: 'user', content: 'היי, מה מצב התורים היום?' },
        { role: 'user', content: 'וגם רציתי לדעת מי במשמרת בוקר' },
        { role: 'assistant', content: 'בוקר טוב! בודק את היומן עבורך.' },
        { role: 'user', content: 'תודה' },
      ]

      const coalesced = coalesceHistory(rawMessages)
      expect(coalesced).toHaveLength(3)
      expect(coalesced[0]!.role).toBe('user')
      expect(coalesced[0]!.content).toEqual([{ type: 'text', text: 'היי, מה מצב התורים היום?\nוגם רציתי לדעת מי במשמרת בוקר' }])
      expect(coalesced[1]!.role).toBe('assistant')
      expect(coalesced[2]!.role).toBe('user')
    })
  })

  describe('Bug 49: MCP WhatsApp sends record in messages and sync conversations', () => {
    it('creates outbound message in messages collection and updates conversation last_message_at', async () => {
      const mockCustomer = {
        id: 'cust_1',
        name: 'דניאל כהן',
        phone: '+972501234567',
      }
      const mockConversation = {
        id: 'conv_1',
        customer: 'cust_1',
      }

      const mockCustomersCol = {
        getOne: vi.fn().mockResolvedValue(mockCustomer),
      }
      const mockConversationsCol = {
        getFirstListItem: vi.fn().mockResolvedValue(mockConversation),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'conv_1' }),
      }
      const mockMessagesCol = {
        create: vi.fn().mockResolvedValue({ id: 'msg_1' }),
      }

      mockSu.collection.mockImplementation((name: string) => {
        if (name === 'customers') return mockCustomersCol
        if (name === 'conversations') return mockConversationsCol
        if (name === 'messages') return mockMessagesCol
        return {}
      })

      const res = await commitMessagingAction('send_reminder', {
        customerId: 'cust_1',
        text: 'שלום דניאל, מזכירים לגבי מקדמה לתור שלך',
      })

      expect(res).toBe('ההודעה נשלחה בהצלחה.')
      expect(mockSendText).toHaveBeenCalledWith({
        to: '+972501234567',
        body: 'שלום דניאל, מזכירים לגבי מקדמה לתור שלך',
      })
      expect(mockMessagesCol.create).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation: 'conv_1',
          whatsapp_message_id: 'wamid.test.123',
          direction: 'outbound',
          sender_type: 'staff',
          type: 'text',
          body: 'שלום דניאל, מזכירים לגבי מקדמה לתור שלך',
        }),
      )
      expect(mockConversationsCol.update).toHaveBeenCalledWith(
        'conv_1',
        expect.objectContaining({
          last_message_at: expect.any(String),
        }),
      )
    })
  })

  describe('Bug 51: Studio time block in calendar.server.ts does not use hardcoded phone', () => {
    it('creates appointment with customer: null and customer_name_override, without fake phone', async () => {
      const mockAppointmentsCol = {
        create: vi.fn().mockResolvedValue({ id: 'appt_block_1' }),
      }
      const mockStudiosCol = {
        getFirstListItem: vi.fn().mockResolvedValue({ id: 'studio_1' }),
      }

      mockSu.collection.mockImplementation((name: string) => {
        if (name === 'appointments') return mockAppointmentsCol
        if (name === 'studios') return mockStudiosCol
        return { getFirstListItem: vi.fn().mockResolvedValue(null) }
      })

      const res = await commitCalendarAction('block_artist_time', {
        staffId: 'staff_1',
        date: '2026-08-15',
        timeSlot: '14:00',
        durationHours: 3,
        reason: 'ישיבת צוות וצביעת קירות',
      })

      expect(res).toContain('נחסם זמן בהצלחה ביומן')
      expect(mockAppointmentsCol.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: null,
          customer_name_override: 'סטודיו Inkmind (חסימת זמן)',
          staff: 'staff_1',
          status: 'confirmed',
          tattoo_description: '[חסימת זמן] ישיבת צוות וצביעת קירות',
          slot_confirmed: true,
        }),
      )
    })
  })

  describe('Bug 17: NPS window recency cutoff', () => {
    it('queries appointments completed within 14 days ago', async () => {
      const mockAppointmentsCol = {
        getFirstListItem: vi.fn().mockResolvedValue(null),
      }
      mockSu.collection.mockReturnValue(mockAppointmentsCol)

      await getCompletedAppointmentAwaitingNpsForBot(mockSu as any, 'cust_99')

      expect(mockAppointmentsCol.getFirstListItem).toHaveBeenCalledTimes(1)
      const filterArg = mockAppointmentsCol.getFirstListItem.mock.calls[0]![0]
      expect(filterArg).toContain('customer = "cust_99"')
      expect(filterArg).toContain('status = "completed"')
      expect(filterArg).toContain('nps_score = null')
      expect(filterArg).toContain('start_time >= "')
    })
  })

  describe('Health Declaration Dynamic Prompt Injection', () => {
    it('includes returning signed customer instruction when healthDeclarationSigned is true', () => {
      const prompt = buildDynamicSystemPrompt({
        customerName: 'נועה ברק',
        healthDeclarationSigned: true,
        healthDeclarationDate: '2026-09-15',
      })

      expect(prompt).toContain('[כרטיס לקוח]')
      expect(prompt).toContain('הצהרת בריאות: חתומה ומאושרת במערכת (נחתמה בתאריך 2026-09-15)')
      expect(prompt).toContain('אין צורך לבקש ממנו למלא את הטופס שוב')
    })

    it('instructs bot to require health declaration when healthDeclarationSigned is false', () => {
      const prompt = buildDynamicSystemPrompt({
        customerName: 'יוסי כהן',
        healthDeclarationSigned: false,
      })

      expect(prompt).toContain('[כרטיס לקוח]')
      expect(prompt).toContain('הצהרת בריאות: טרם נחתמה')
      expect(prompt).toContain('הלקוח חייב למלא הצהרת בריאות דיגיטלית לפני תשלום מקדמה')
    })
  })

  describe('Bugs 53, 55, 18: updateAppointment date/time merging and waitlist triggering', () => {
    it('merges single date update with existing appointment hour and minute (Bug 53)', async () => {
      const existingDate = new Date(2026, 6, 22, 14, 30) // 2026-07-22 14:30 local
      const mockBefore = {
        id: 'appt_53_a',
        start_time: existingDate.toISOString(),
        status: 'confirmed',
        duration_minutes: 120,
      }

      const mockAppointmentsCol = {
        getOne: vi.fn().mockResolvedValue(mockBefore),
        update: vi.fn().mockResolvedValue({ id: 'appt_53_a' }),
      }
      mockSu.collection.mockReturnValue(mockAppointmentsCol)

      await handleUpdateAppointment({
        id: 'appt_53_a',
        date: '2026-08-10', // only date changed, no timeSlot
      }, mockSu as any)

      expect(mockAppointmentsCol.update).toHaveBeenCalledTimes(1)
      const updatePayload = mockAppointmentsCol.update.mock.calls[0]![1]
      expect(updatePayload.start_time).toBeDefined()
      const updatedDate = new Date(updatePayload.start_time)
      expect(updatedDate.getFullYear()).toBe(2026)
      expect(updatedDate.getMonth()).toBe(7) // August (0-indexed 7)
      expect(updatedDate.getDate()).toBe(10)
      expect(updatedDate.getHours()).toBe(14)
      expect(updatedDate.getMinutes()).toBe(30)
    })

    it('merges single timeSlot update with existing appointment date (Bug 53)', async () => {
      const existingDate = new Date(2026, 6, 22, 14, 30)
      const mockBefore = {
        id: 'appt_53_b',
        start_time: existingDate.toISOString(),
        status: 'confirmed',
        duration_minutes: 120,
      }

      const mockAppointmentsCol = {
        getOne: vi.fn().mockResolvedValue(mockBefore),
        update: vi.fn().mockResolvedValue({ id: 'appt_53_b' }),
      }
      mockSu.collection.mockReturnValue(mockAppointmentsCol)

      await handleUpdateAppointment({
        id: 'appt_53_b',
        timeSlot: '17:45', // only timeSlot changed, no date
      }, mockSu as any)

      expect(mockAppointmentsCol.update).toHaveBeenCalledTimes(1)
      const updatePayload = mockAppointmentsCol.update.mock.calls[0]![1]
      expect(updatePayload.start_time).toBeDefined()
      const updatedDate = new Date(updatePayload.start_time)
      expect(updatedDate.getFullYear()).toBe(2026)
      expect(updatedDate.getMonth()).toBe(6) // July
      expect(updatedDate.getDate()).toBe(22)
      expect(updatedDate.getHours()).toBe(17)
      expect(updatedDate.getMinutes()).toBe(45)
    })

    it('cancels watching waitlist entries and calls runWaitlistMatching on status cancelled (Bugs 18, 55)', async () => {
      const mockBefore = {
        id: 'appt_cancel_1',
        start_time: '2026-07-25T10:00:00.000Z',
        status: 'confirmed',
        duration_minutes: 120,
        staff: 'staff_1',
      }
      const mockWaitlistCol = {
        getFullList: vi.fn().mockResolvedValue([{ id: 'wl_1' }, { id: 'wl_2' }]),
        update: vi.fn().mockResolvedValue({ status: 'cancelled' }),
      }
      const mockAppointmentsCol = {
        getOne: vi.fn().mockResolvedValue(mockBefore),
        update: vi.fn().mockResolvedValue({ id: 'appt_cancel_1' }),
      }

      mockSu.collection.mockImplementation((name: string) => {
        if (name === 'appointments') return mockAppointmentsCol
        if (name === 'waitlist_entries') return mockWaitlistCol
        return {}
      })

      await handleUpdateAppointment({
        id: 'appt_cancel_1',
        status: 'cancelled',
      }, mockSu as any)

      expect(mockWaitlistCol.update).toHaveBeenCalledWith('wl_1', { status: 'cancelled' })
      expect(mockWaitlistCol.update).toHaveBeenCalledWith('wl_2', { status: 'cancelled' })
      expect(mockRunWaitlistMatching).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'appt_cancel_1',
          staff: 'staff_1',
          startTime: '2026-07-25T10:00:00.000Z',
          durationMinutes: 120,
        }),
      )
    })

    // Deleting an appointment: the waitlist bookkeeping now runs inside PocketBase
    // (pb_hooks/data-integrity.pb.js) and is covered by tests/integration/data-integrity.test.ts.
  })
})
