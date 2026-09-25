import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { WhatsAppInboundEvent } from '@/integrations/whatsapp-cloud-api/types'

// Mock dependencies
const mockAddSystemNotification = vi.fn().mockResolvedValue({ id: 'notif_1' })
vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: (...args: any[]) => mockAddSystemNotification(...args),
}))

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue({
    phoneNumberId: 'pn_123',
    accessToken: 'token_123',
  }),
}))

vi.mock('@/integrations/ai/agent.server', () => ({
  runBotTurn: vi.fn().mockResolvedValue(undefined),
  abortActiveTurn: vi.fn(),
}))

vi.mock('@/lib/debounce-scheduler', () => ({
  botTurnScheduler: {
    schedule: vi.fn(),
    cancel: vi.fn(),
  },
}))

const mockConversationsCollection = {
  getOne: vi.fn(),
  getList: vi.fn().mockResolvedValue({ items: [], totalItems: 0 }),
  getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
  create: vi.fn().mockResolvedValue({
    id: 'conv_123',
    status: 'bot_active',
    state: 'NEW',
    last_message_at: null,
  }),
  update: vi.fn().mockResolvedValue({ id: 'conv_123' }),
}

const mockCustomersCollection = {
  getFirstListItem: vi.fn().mockResolvedValue({
    id: 'cust_123',
    name: 'ישראל ישראלי',
    phone: '972501234567',
  }),
  create: vi.fn().mockResolvedValue({
    id: 'cust_123',
    name: 'ישראל ישראלי',
    phone: '972501234567',
  }),
  update: vi.fn().mockResolvedValue({ id: 'cust_123' }),
}

const mockMessagesCollection = {
  getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
  create: vi.fn().mockResolvedValue({
    id: 'msg_123',
    conversation: 'conv_123',
    direction: 'inbound',
    body: 'היי אני רוצה לקבוע תור לקעקוע',
  }),
  update: vi.fn().mockResolvedValue({ id: 'msg_123' }),
}

const mockSettingsCollection = {
  getList: vi.fn().mockResolvedValue({ items: [{ ai_enabled: true }], totalItems: 1 }),
  getFirstListItem: vi.fn().mockResolvedValue({
    ai_enabled: true,
  }),
}

const mockStaffCollection = {
  getFullList: vi.fn().mockResolvedValue([]),
}

const mockSu = {
  collection: vi.fn((name: string) => {
    switch (name) {
      case 'conversations':
        return mockConversationsCollection
      case 'customers':
        return mockCustomersCollection
      case 'messages':
        return mockMessagesCollection
      case 'settings':
        return mockSettingsCollection
      case 'staff':
        return mockStaffCollection
      default:
        return {
          getOne: vi.fn(),
          getList: vi.fn().mockResolvedValue({ items: [] }),
          getFirstListItem: vi.fn().mockRejectedValue(new Error('Not found')),
          create: vi.fn().mockResolvedValue({ id: 'item_1' }),
          update: vi.fn().mockResolvedValue({ id: 'item_1' }),
        }
    }
  }),
  filter: vi.fn((str) => str),
}

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn().mockResolvedValue(mockSu),
  createRequestClient: vi.fn(),
}))

describe('Webhook Inbound Message Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches addSystemNotification when a customer sends an inbound message', async () => {
    const { processInboundEvent } = await import('@/features/conversations/server/webhook')

    const inboundEvent: WhatsAppInboundEvent = {
      kind: 'message',
      wamid: 'wamid.HBgM...',
      from: '972501234567',
      timestamp: String(Math.floor(Date.now() / 1000)),
      senderName: 'ישראל ישראלי',
      message: {
        type: 'text',
        body: 'שלום, כמה עולה קעקוע קטן?',
        media: null,
        location: null,
        replyToWamid: null,
      },
    }

    await processInboundEvent(inboundEvent)

    expect(mockAddSystemNotification).toHaveBeenCalledTimes(1)
    expect(mockAddSystemNotification).toHaveBeenCalledWith({
      title: expect.stringContaining('ישראל ישראלי'),
      message: 'שלום, כמה עולה קעקוע קטן?',
      type: 'info',
      link: '/dashboard/conversations?chatId=conv_123',
    })
  })
})
