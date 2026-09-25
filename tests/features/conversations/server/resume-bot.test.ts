import { describe, expect, it, vi, beforeEach } from 'vitest'
import { handleResumeBotWithInstruction } from '@/features/conversations/server/messages.server'
import * as pbModule from '@/integrations/pocketbase/superuser.server'
import * as sessionModule from '@/lib/session.server'
import * as agentModule from '@/integrations/ai/agent.server'
import { extractCleanStaffInstruction, isVerifiedStaffInstruction } from '@/integrations/ai/engine/staff-instruction'

vi.mock('@/lib/session.server', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

vi.mock('@/integrations/ai/agent.server', () => ({
  runBotTurn: vi.fn().mockResolvedValue(undefined),
}))

describe('Resume Bot with Instruction (HITL Resume)', () => {
  let mockConversation: Record<string, unknown>
  let mockCustomer: Record<string, unknown>
  let updatedConversation: Record<string, unknown> | null
  let createdMessages: Array<Record<string, unknown>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCustomer = {
      id: 'cust_123',
      name: 'דניאל',
      phone: '0501234567',
    }

    // Default: active 24h window (expires in 1 hour)
    mockConversation = {
      id: 'conv_123',
      customer: 'cust_123',
      expand: { customer: mockCustomer },
      status: 'escalated',
      is_staff_called: true,
      staff_call_reason: 'consultation_alert',
      whatsapp_window_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    }

    updatedConversation = null
    createdMessages = []

    const mockSu = {
      collection: (col: string) => {
        if (col === 'conversations') {
          return {
            getOne: vi.fn().mockResolvedValue(mockConversation),
            update: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
              updatedConversation = data
              return Promise.resolve({ id, ...mockConversation, ...data })
            }),
          }
        }
        if (col === 'messages') {
          return {
            create: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              createdMessages.push(data)
              return Promise.resolve({ id: 'msg_created', ...data })
            }),
          }
        }
        return {}
      },
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockSu as any)
    vi.mocked(sessionModule.getSession).mockResolvedValue({
      staff: { id: 'staff_1', name: 'אמן ראשי' },
    } as any)
  })

  it('rejects with an error when the user is not authenticated', async () => {
    vi.mocked(sessionModule.getSession).mockResolvedValue(null)

    await expect(
      handleResumeBotWithInstruction({
        conversationId: 'conv_123',
        instruction: 'המשך',
      }),
    ).rejects.toThrow('לא מחובר.')
  })

  it('rejects when the 24h window is expired and triggerTurn is true', async () => {
    mockConversation.whatsapp_window_expires_at = new Date(Date.now() - 3600 * 1000).toISOString()

    await expect(
      handleResumeBotWithInstruction({
        conversationId: 'conv_123',
        triggerTurn: true,
      }),
    ).rejects.toThrow('חלון 24 השעות של וואטסאפ נסגר')
  })

  it('allows resuming when 24h window is expired if triggerTurn is false (quiet resume)', async () => {
    mockConversation.whatsapp_window_expires_at = new Date(Date.now() - 3600 * 1000).toISOString()

    const res = await handleResumeBotWithInstruction({
      conversationId: 'conv_123',
      triggerTurn: false,
    })

    expect(res).toEqual({ ok: true })
    expect(updatedConversation).toMatchObject({
      status: 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
    })
    expect(agentModule.runBotTurn).not.toHaveBeenCalled()
  })

  it('successfully resumes bot with instruction: saves internal staff message and fires runBotTurn with force: true', async () => {
    const res = await handleResumeBotWithInstruction({
      conversationId: 'conv_123',
      instruction: 'אישרתי את הסקיצה, המחיר 600 ש"ח, תציע תור לשלישי',
      triggerTurn: true,
    })

    expect(res).toEqual({ ok: true })

    // Check message was created
    expect(createdMessages).toHaveLength(1)
    const msg = createdMessages[0]!
    expect(isVerifiedStaffInstruction(msg)).toBe(true)
    expect(extractCleanStaffInstruction(msg.body as string)).toBe('אישרתי את הסקיצה, המחיר 600 ש"ח, תציע תור לשלישי')
    expect(msg.sender_type).toBe('staff')
    expect(msg.direction).toBe('outbound')
    expect(String(msg.whatsapp_message_id).startsWith('internal_staff_')).toBe(true)

    // Check conversation was updated
    expect(updatedConversation).toMatchObject({
      status: 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
    })

    // Check runBotTurn was called with force: true
    expect(agentModule.runBotTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_123',
        customerId: 'cust_123',
        force: true,
      }),
    )
  })

  it('successfully resumes bot without instruction: flips status and triggers bot turn', async () => {
    const res = await handleResumeBotWithInstruction({
      conversationId: 'conv_123',
      instruction: '',
      triggerTurn: true,
    })

    expect(res).toEqual({ ok: true })
    expect(createdMessages).toHaveLength(0)
    expect(updatedConversation).toMatchObject({
      status: 'bot_active',
      is_staff_called: false,
      staff_call_reason: '',
    })
    expect(agentModule.runBotTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'conv_123',
        customerId: 'cust_123',
        force: true,
      }),
    )
  })
})
