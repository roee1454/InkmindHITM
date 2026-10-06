import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createFakePocketBase } from '@/test-utils/fakePocketBase'
import type { getSuperuserClient as GetSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import type { buildMessagingTools as BuildMessagingTools } from '@/features/mcp-assistant/server/tool-servers/messaging.server'
import type { McpToolContext } from '@/features/mcp-assistant/server/tool-servers/shared'

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

let getSuperuserClient: typeof GetSuperuserClient
let buildMessagingTools: typeof BuildMessagingTools

beforeAll(async () => {
  ;({ getSuperuserClient } = await import('@/integrations/pocketbase/superuser.server'))
  ;({ buildMessagingTools } = await import('@/features/mcp-assistant/server/tool-servers/messaging.server'))
})

describe('messaging.server read tools (customer conversations)', () => {
  function makeCtx(su: ReturnType<typeof createFakePocketBase>): McpToolContext {
    return {
      su: su as never,
      staff: { id: 'staff1', name: 'רועי', role: 'admin' } as never,
      proposals: [],
    }
  }

  it('get_customer_conversation returns messages in chronological order and 24h window info', async () => {
    const su = createFakePocketBase()
    const futureWindow = new Date(Date.now() + 10 * 3600 * 1000).toISOString()
    su._seed('customers', [{ id: 'cust1', name: 'מאי כהן', phone: '0501234567' }])
    su._seed('conversations', [
      {
        id: 'conv1',
        customer: 'cust1',
        status: 'staff_handling',
        state: 'AWAIT_PRICE_OFFER',
        window_expires_at: futureWindow,
        unread_count: 2,
      },
    ])
    su._seed('messages', [
      {
        id: 'msg1',
        conversation: 'conv1',
        sender_type: 'customer',
        direction: 'inbound',
        type: 'text',
        body: 'היי, רציתי לשאול לגבי קעקוע',
        created: '2026-03-01T10:00:00.000Z',
      },
      {
        id: 'msg2',
        conversation: 'conv1',
        sender_type: 'customer',
        direction: 'inbound',
        type: 'image',
        body: '',
        media_category: 'inspiration',
        created: '2026-03-01T10:05:00.000Z',
      },
      {
        id: 'msg3',
        conversation: 'conv1',
        sender_type: 'ai_bot',
        direction: 'outbound',
        type: 'text',
        body: 'היי מאי! איזה יופי. איפה תרצי למקם את הקעקוע?',
        created: '2026-03-01T10:06:00.000Z',
      },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildMessagingTools(makeCtx(su))
    const result = await (tools.get_customer_conversation.execute as Function)({ customerId: 'cust1' })

    expect(result.status).toBe('success')
    expect(result.data.customerName).toBe('מאי כהן')
    expect(result.data.isWindowOpen).toBe(true)
    expect(result.data.state).toBe('AWAIT_PRICE_OFFER')
    expect(result.data.messages).toHaveLength(3)
    // Chronological order: first msg1, then msg2, then msg3
    expect(result.data.messages[0].id).toBe('msg1')
    expect(result.data.messages[0].body).toBe('היי, רציתי לשאול לגבי קעקוע')
    expect(result.data.messages[1].mediaCategory).toBe('inspiration')
    expect(result.data.messages[2].senderType).toBe('ai_bot')
  })

  it('get_customer_conversation returns error when conversation is not found', async () => {
    const su = createFakePocketBase()
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildMessagingTools(makeCtx(su))
    const result = await (tools.get_customer_conversation.execute as Function)({ customerId: 'non_existent' })

    expect(result.status).toBe('error')
    expect(result.message).toContain('לא נמצאה שיחה')
  })

  it('list_conversations filters for conversations needing attention', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [
      { id: 'c1', name: 'דניאל' },
      { id: 'c2', name: 'שרה' },
    ])
    su._seed('conversations', [
      {
        id: 'conv1',
        customer: 'c1',
        status: 'staff_handling',
        state: 'AWAIT_PRICE_OFFER',
        last_message_preview: 'מה המחיר?',
        last_message_at: '2026-03-01T12:00:00Z',
        unread_count: 1,
      },
      {
        id: 'conv2',
        customer: 'c2',
        status: 'bot_active',
        state: 'COMPLETED',
        last_message_preview: 'תודה רבה!',
        last_message_at: '2026-03-01T11:00:00Z',
        unread_count: 0,
      },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildMessagingTools(makeCtx(su))
    const result = await (tools.list_conversations.execute as Function)({ needsAttentionOnly: true })

    expect(result.status).toBe('success')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].customerName).toBe('דניאל')
    expect(result.data[0].state).toBe('AWAIT_PRICE_OFFER')
  })

  it('search_conversation_messages finds messages containing search query', async () => {
    const su = createFakePocketBase()
    su._seed('customers', [{ id: 'c1', name: 'אורן' }])
    su._seed('conversations', [{ id: 'conv1', customer: 'c1' }])
    su._seed('messages', [
      { id: 'm1', conversation: 'conv1', body: 'אני רוצה קעקוע של אריה ביד', created: '2026-03-01T10:00:00Z' },
      { id: 'm2', conversation: 'conv1', body: 'באיזה יום אתם פתוחים?', created: '2026-03-01T11:00:00Z' },
    ])
    vi.mocked(getSuperuserClient).mockResolvedValue(su as never)

    const tools = buildMessagingTools(makeCtx(su))
    const result = await (tools.search_conversation_messages.execute as Function)({ query: 'אריה' })

    expect(result.status).toBe('success')
    expect(result.data).toHaveLength(1)
    expect(result.data[0].body).toContain('אריה')
  })
})
