import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  handleStaffConfirmHealthDeclaration,
  handleResendHealthDeclarationLink,
} from '@/features/conversations/server/messages.server'
import * as pbModule from '@/integrations/pocketbase/superuser.server'
import * as waSettingsModule from '@/integrations/whatsapp-cloud-api/settings.server'
import * as studioPolicyModule from '@/features/settings/server/policy'
import * as waClientModule from '@/integrations/whatsapp-cloud-api/client'
import * as stateMachineModule from '@/features/conversations/server/state-machine'
import * as botAppointmentsModule from '@/features/calendar/server/bot-appointments.server'

vi.mock('@/lib/session.server', () => ({
  getSession: vi.fn().mockResolvedValue({ id: 'staff_1' }),
}))

vi.mock('@/integrations/pocketbase/superuser.server', () => ({
  getSuperuserClient: vi.fn(),
}))

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn(),
}))

vi.mock('@/features/settings/server/policy', () => ({
  getStudioPolicyForBot: vi.fn(),
}))

vi.mock('@/integrations/whatsapp-cloud-api/client', () => ({
  createWhatsAppClient: vi.fn(),
}))

vi.mock('@/features/conversations/server/state-machine', () => ({
  transition: vi.fn().mockResolvedValue({ from: 'AWAIT_HEALTH_NOTICE', to: 'AWAIT_PAYMENT' }),
}))

vi.mock('@/features/calendar/server/bot-appointments.server', () => ({
  getActiveAppointmentForBot: vi.fn(),
  cancelAppointmentForBot: vi.fn(),
}))

describe('Health Declaration CRM Actions (staffConfirmHealthDeclaration & resendHealthDeclarationLink)', () => {
  let sentWhatsAppMessages: Array<{ to: string; body: string }> = []
  let updatedCustomers: Record<string, Record<string, unknown>> = {}
  let createdMessages: Array<Record<string, unknown>> = []

  const mockSendText = vi.fn().mockImplementation(async ({ to, body }: { to: string; body: string }) => {
    sentWhatsAppMessages.push({ to, body })
    return { wamid: 'wamid_health_test' }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    sentWhatsAppMessages = []
    updatedCustomers = {}
    createdMessages = []

    vi.mocked(waSettingsModule.getWhatsAppSettings).mockResolvedValue({
      phoneNumberId: 'phone_123',
      accessToken: 'token_123',
      verifyToken: 'secret',
      appSecret: 'app_secret',
      businessAccountId: 'waba_123',
    })

    vi.mocked(waClientModule.createWhatsAppClient).mockReturnValue({
      sendText: mockSendText,
      sendTemplate: vi.fn(),
      downloadMedia: vi.fn(),
      getMediaUrl: vi.fn(),
      markAsRead: vi.fn(),
    } as unknown as ReturnType<typeof waClientModule.createWhatsAppClient>)

    vi.mocked(studioPolicyModule.getStudioPolicyForBot).mockResolvedValue({
      paymentInstructions: 'ביט למספר טלפון: 0527051611\nבנק 12 סניף 685 מס חשבון 474412',
      reviewLink: 'https://g.page/review',
      cancellationCutoffHours: 48,
      depositRequired: true,
      depositAmount: 150,
      healthDeclarationFormUrl: 'https://custom-studio.com/health-declaration',
      healthDeclarationValidityMonths: 6,
    })

    const mockPb = {
      collection: (name: string) => ({
        getOne: vi.fn().mockImplementation(async (id: string) => {
          if (name === 'conversations') {
            return {
              id,
              customer: 'cust_123',
              expand: {
                customer: {
                  id: 'cust_123',
                  phone: '972521234567',
                  name: 'רועי',
                  health_declaration_signed: false,
                },
              },
              state: 'AWAIT_HEALTH_NOTICE',
              status: 'staff_handling',
            }
          }
          if (name === 'customers') {
            return {
              id,
              phone: '972521234567',
              name: 'רועי',
              health_declaration_signed: false,
            }
          }
          return { id }
        }),
        update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
          if (name === 'customers') {
            updatedCustomers[id] = { ...(updatedCustomers[id] || {}), ...data }
          }
          return { id, ...data }
        }),
        create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
          if (name === 'messages') {
            createdMessages.push(data)
          }
          return { id: 'msg_created', ...data }
        }),
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as unknown as Awaited<ReturnType<typeof pbModule.getSuperuserClient>>)
  })

  it('staffConfirmHealthDeclaration marks declaration as signed, sends payment info, and transitions to AWAIT_PAYMENT', async () => {
    vi.mocked(botAppointmentsModule.getActiveAppointmentForBot).mockResolvedValue({
      id: 'app_1',
      type: 'tattoo',
      deposit_amount: 200,
    } as unknown as Awaited<ReturnType<typeof botAppointmentsModule.getActiveAppointmentForBot>>)

    const result = await handleStaffConfirmHealthDeclaration({ conversationId: 'conv_123' })
    expect(result.success).toBe(true)

    // Verify customer updated
    expect(updatedCustomers['cust_123']?.health_declaration_signed).toBe(true)
    expect(updatedCustomers['cust_123']?.health_declaration_date).toBeDefined()

    // Verify state machine transitioned to AWAIT_PAYMENT
    expect(stateMachineModule.transition).toHaveBeenCalledWith(
      expect.anything(),
      'conv_123',
      'AWAIT_PAYMENT',
      expect.objectContaining({
        reason: 'staffConfirmHealthDeclaration_await_payment',
        actor: 'staff',
      }),
    )

    // Verify messages sent (slot summary and payment instructions, neither having location)
    expect(sentWhatsAppMessages).toHaveLength(2)
    expect(sentWhatsAppMessages[0]?.to).toBe('972521234567')
    expect(sentWhatsAppMessages[0]?.body).toContain('הצהרת הבריאות אושרה בהצלחה')
    expect(sentWhatsAppMessages[0]?.body).not.toContain('שוהם מרקט')
    expect(sentWhatsAppMessages[1]?.body).toContain('₪200')
    expect(sentWhatsAppMessages[1]?.body).toContain('ביט למספר טלפון: 0527051611')
    expect(sentWhatsAppMessages[1]?.body).toContain('בנק 12 סניף 685 מס חשבון 474412')
    expect(sentWhatsAppMessages[1]?.body).not.toContain('שוהם מרקט')
  })

  it('staffConfirmHealthDeclaration transitions to AWAITING_APPOINTMENT directly for free sketch consultation (deposit = 0)', async () => {
    vi.mocked(botAppointmentsModule.getActiveAppointmentForBot).mockResolvedValue({
      id: 'app_sketch_free',
      type: 'sketch',
      deposit_amount: 0,
    } as unknown as Awaited<ReturnType<typeof botAppointmentsModule.getActiveAppointmentForBot>>)

    const result = await handleStaffConfirmHealthDeclaration({ conversationId: 'conv_123' })
    expect(result.success).toBe(true)

    // Verify customer updated
    expect(updatedCustomers['cust_123']?.health_declaration_signed).toBe(true)

    // Transitioned to AWAITING_APPOINTMENT without asking for payment
    expect(stateMachineModule.transition).toHaveBeenCalledWith(
      expect.anything(),
      'conv_123',
      'AWAITING_APPOINTMENT',
      expect.objectContaining({
        reason: 'staffConfirmHealthDeclaration_free_sketch',
        actor: 'staff',
      }),
    )

    // Confirm message sent with no payment instructions
    expect(sentWhatsAppMessages).toHaveLength(1)
    expect(sentWhatsAppMessages[0]?.body).toContain('הצהרת הבריאות אושרה במערכת הסטודיו.')
    expect(sentWhatsAppMessages[0]?.body).toContain('פגישת הסקיצה מאושרת וסגורה ביומן')
    expect(sentWhatsAppMessages[0]?.body).not.toContain('ביט למספר')
  })

  it('resendHealthDeclarationLink sends WhatsApp reminder with form link', async () => {
    const result = await handleResendHealthDeclarationLink({ conversationId: 'conv_123' })
    expect(result.success).toBe(true)

    expect(sentWhatsAppMessages).toHaveLength(1)
    expect(sentWhatsAppMessages[0]?.to).toBe('972521234567')
    expect(sentWhatsAppMessages[0]?.body).toContain('תזכורת למילוי הצהרת הבריאות לקראת התור:')
    expect(sentWhatsAppMessages[0]?.body).toContain('https://custom-studio.com/health-declaration')
  })

  it('resendHealthDeclarationLink throws error when health declaration URL is not configured', async () => {
    vi.mocked(studioPolicyModule.getStudioPolicyForBot).mockResolvedValueOnce({
      paymentInstructions: 'ביט למספר: 0527051611',
      reviewLink: 'https://g.page/review',
      cancellationCutoffHours: 48,
      depositRequired: true,
      depositAmount: 150,
      healthDeclarationFormUrl: null,
      healthDeclarationValidityMonths: 6,
    })

    await expect(handleResendHealthDeclarationLink({ conversationId: 'conv_123' })).rejects.toThrow(
      'טרם הוגדר קישור לטופס הצהרת בריאות בהגדרות הסטודיו (הגדרות מדיניות ותפעול).',
    )
  })
})
