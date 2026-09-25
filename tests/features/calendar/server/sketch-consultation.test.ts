import { describe, expect, it, vi, beforeEach } from 'vitest'
import { sendPriceQuoteToCustomerHandler } from '@/features/calendar/server/appointments.server'
import { handleGetActiveAppointmentSummary } from '@/features/conversations/server/messages.server'
import '@/features/settings/server/helpers.server'
import * as pbModule from '@/integrations/pocketbase/superuser.server'
import * as waSettingsModule from '@/integrations/whatsapp-cloud-api/settings.server'
import * as studioPolicyModule from '@/features/settings/server/policy'
import * as waClientModule from '@/integrations/whatsapp-cloud-api/client'
import * as stateMachineModule from '@/features/conversations/server/state-machine'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'staff_1' }),
  requireSession: vi.fn().mockResolvedValue({ id: 'staff_1' }),
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
  transition: vi.fn().mockResolvedValue({ from: 'AWAIT_PRICE_OFFER', to: 'AWAIT_PAYMENT' }),
  canTransition: vi.fn().mockReturnValue(true),
  toConversationState: vi.fn((state: unknown) => state),
}))

vi.mock('@/lib/session.server', () => ({
  getSession: vi.fn().mockResolvedValue({ id: 'staff_1' }),
}))

vi.mock('@/features/calendar/server/bot-appointments.server', () => ({
  getActiveAppointmentForBot: vi.fn().mockResolvedValue(null),
  cancelAppointmentForBot: vi.fn(),
  checkAvailabilityForBot: vi.fn().mockResolvedValue({ available: true }),
}))

describe('Sketch Consultation & Follow-up Workflows', () => {
  let sentMessages: Array<{ to: string; body: string }> = []
  let updatedAppointments: Record<string, Record<string, unknown>> = {}
  let createdMessages: Array<Record<string, unknown>> = []

  const mockSendText = vi.fn().mockImplementation(async ({ to, body }: { to: string; body: string }) => {
    sentMessages.push({ to, body })
    return { wamid: 'wamid_test_123' }
  })

  beforeEach(() => {
    vi.clearAllMocks()
    sentMessages = []
    updatedAppointments = {}
    createdMessages = []

    vi.mocked(waSettingsModule.getWhatsAppSettings).mockResolvedValue({
      phoneNumberId: 'phone_123',
      accessToken: 'token_123',
    } as never)

    vi.mocked(studioPolicyModule.getStudioPolicyForBot).mockResolvedValue({
      paymentInstructions: 'ניתן לשלם בביט או בהעברה בנקאית',
      healthDeclarationFormUrl: 'https://custom-studio.com/health-declaration',
      healthDeclarationValidityMonths: 6,
    } as never)

    vi.mocked(waClientModule.createWhatsAppClient).mockReturnValue({
      sendText: mockSendText,
    } as never)
  })

  it('formats WhatsApp quote properly for sketch consult with deposit (no fake tattoo price)', async () => {
    const mockAppointment = {
      id: 'apt_sketch_1',
      type: 'sketch',
      start_time: '2026-09-22T13:30:00.000Z',
      duration_minutes: 45,
      staff: 'staff_dor',
      expand: {
        customer: { id: 'cust_1', phone: '0501234567', health_declaration_signed: true },
        staff: { name: 'דור' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAppointment),
            update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
              updatedAppointments[id] = { ...updatedAppointments[id], ...data }
              return { id, ...data }
            }),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_1',
              whatsapp_window_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            }),
          }
        }
        if (col === 'messages') {
          return {
            create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              createdMessages.push(data)
              return { id: 'msg_1', ...data }
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    await sendPriceQuoteToCustomerHandler({
      appointmentId: 'apt_sketch_1',
      priceMinIls: 0,
      priceMaxIls: 0,
      depositAmount: 150,
      durationMinutes: 45,
    })

    // Appointment updated with price_min: null and price_max: null
    expect(updatedAppointments['apt_sketch_1']).toMatchObject({
      price_min: null,
      price_max: null,
      deposit_amount: 150,
      duration_minutes: 45,
    })

    // WhatsApp message verifies sketch copy without "מחיר הקעקוע:"
    expect(sentMessages).toHaveLength(1)
    const body = sentMessages[0]!.body
    expect(body).toContain('פרטי פגישת הייעוץ:')
    expect(body).toContain('אצל דור')
    expect(body).toContain('מקדמה לשריון: ₪150 (תקוזז מעלות הקעקוע).')
    expect(body).not.toContain('מחיר הקעקוע:')
    expect(body).not.toContain('מחיר משוער:')
  })

  it('handles free sketch consult (deposit: 0) and confirms slot directly when health declaration signed', async () => {
    const mockAppointment = {
      id: 'apt_sketch_free',
      type: 'sketch',
      start_time: '2026-09-22T13:30:00.000Z',
      duration_minutes: 45,
      staff: 'staff_dor',
      expand: {
        customer: { id: 'cust_free', phone: '0501234567', health_declaration_signed: true, health_declaration_date: '2026-09-01T10:00:00.000Z' },
        staff: { name: 'דור' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAppointment),
            update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
              updatedAppointments[id] = { ...updatedAppointments[id], ...data }
              return { id, ...data }
            }),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_free',
              whatsapp_window_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            }),
          }
        }
        if (col === 'messages') {
          return {
            create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              createdMessages.push(data)
              return { id: 'msg_2', ...data }
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    await sendPriceQuoteToCustomerHandler({
      appointmentId: 'apt_sketch_free',
      priceMinIls: 0,
      priceMaxIls: 0,
      depositAmount: 0,
      durationMinutes: 45,
    })

    expect(sentMessages).toHaveLength(1)
    const body = sentMessages[0]!.body
    expect(body).toContain('פגישת הייעוץ ללא עלות.')
    expect(body).not.toContain('מחיר הקעקוע:')
    expect(body).not.toContain('מחיר משוער:')
    expect(body).not.toContain('מקדמה לשריון: ₪0')

    // Appointment marked confirmed directly
    expect(updatedAppointments['apt_sketch_free']).toMatchObject({
      status: 'confirmed',
      slot_confirmed: true,
    })

    // State machine transitioned directly to AWAITING_APPOINTMENT
    expect(stateMachineModule.transition).toHaveBeenCalledWith(
      expect.anything(),
      'conv_free',
      'AWAITING_APPOINTMENT',
      expect.objectContaining({
        reason: 'sendPriceQuoteToCustomer_sketch_free_confirmed',
      }),
    )
  })

  it('keeps standard tattoo pricing message for tattoo appointments', async () => {
    const mockAppointment = {
      id: 'apt_tattoo_1',
      type: 'tattoo',
      start_time: '2026-09-22T13:30:00.000Z',
      duration_minutes: 180,
      staff: 'staff_dor',
      expand: {
        customer: { id: 'cust_tattoo', phone: '0501234567', health_declaration_signed: true },
        staff: { name: 'דור' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAppointment),
            update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
              updatedAppointments[id] = { ...updatedAppointments[id], ...data }
              return { id, ...data }
            }),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_tattoo',
              whatsapp_window_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            }),
          }
        }
        if (col === 'messages') {
          return {
            create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              createdMessages.push(data)
              return { id: 'msg_3', ...data }
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    await sendPriceQuoteToCustomerHandler({
      appointmentId: 'apt_tattoo_1',
      priceMinIls: 800,
      priceMaxIls: 1000,
      depositAmount: 350,
      durationMinutes: 180,
    })

    expect(updatedAppointments['apt_tattoo_1']).toMatchObject({
      price_min: 800,
      price_max: 1000,
      deposit_amount: 350,
      duration_minutes: 180,
    })

    expect(sentMessages).toHaveLength(1)
    const body = sentMessages[0]!.body
    expect(body).toContain('פרטי התור לקעקוע:')
    expect(body).toContain('מחיר משוער: ₪800–1,000.')
    expect(body).toContain('מקדמה לשריון: ₪350.')
  })

  it('getActiveAppointmentSummary returns recently completed sketch appointment when conversation is in WANTS_TO_BOOK', async () => {
    const mockCompletedSketch = {
      id: 'apt_sketch_done_99',
      customer: 'cust_done_1',
      type: 'sketch',
      status: 'completed',
      tattoo_description: 'סקיצה של שושנים על הכתף',
      staff: 'staff_dor',
      start_time: '2026-09-22T10:00:00.000Z',
      duration_minutes: 45,
      deposit_amount: 150,
      deposit_paid: true,
      slot_confirmed: true,
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'conversations') {
          return {
            getOne: vi.fn().mockResolvedValue({
              id: 'conv_done_1',
              customer: 'cust_done_1',
              state: 'WANTS_TO_BOOK',
            }),
          }
        }
        if (col === 'appointments') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue(mockCompletedSketch),
          }
        }
        if (col === 'staff') {
          return {
            getOne: vi.fn().mockResolvedValue({ id: 'staff_dor', name: 'דור' }),
          }
        }
        return { getOne: vi.fn(), getFirstListItem: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    const summary = await handleGetActiveAppointmentSummary({ conversationId: 'conv_done_1' })

    expect(summary).not.toBeNull()
    expect(summary).toMatchObject({
      id: 'apt_sketch_done_99',
      type: 'sketch',
      status: 'completed',
      tattooDescription: 'סקיצה של שושנים על הכתף',
      staffName: 'דור',
      durationMinutes: 45,
      depositAmount: 150,
      depositPaid: true,
      slotConfirmed: true,
    })
  })

  it('detects sketch consultation from tattoo_description or duration even if appointment.type was not set', async () => {
    const mockAppointment = {
      id: 'apt_sketch_untyped',
      type: undefined,
      tattoo_description: 'פגישת סקיצה וייעוץ לקעקוע גב',
      start_time: '2026-09-22T15:00:00.000Z',
      duration_minutes: 45,
      staff: 'staff_dor',
      expand: {
        customer: { id: 'cust_untyped', phone: '0509999999', health_declaration_signed: true },
        staff: { name: 'דור' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockAppointment),
            update: vi.fn().mockImplementation(async (id: string, patch: Record<string, unknown>) => {
              updatedAppointments[id] = patch
              return { ...mockAppointment, ...patch }
            }),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_untyped',
              whatsapp_window_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            }),
          }
        }
        if (col === 'messages') {
          return {
            create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
              createdMessages.push(data)
              return { id: 'msg_u', ...data }
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    await sendPriceQuoteToCustomerHandler({
      appointmentId: 'apt_sketch_untyped',
      priceMinIls: 0,
      priceMaxIls: 0,
      depositAmount: 150,
      durationMinutes: 45,
    })

    // Assert that the appointment is healed with type: 'sketch' and price_min/max null
    expect(updatedAppointments['apt_sketch_untyped']).toMatchObject({
      type: 'sketch',
      price_min: null,
      price_max: null,
      deposit_amount: 150,
      duration_minutes: 45,
    })

    // Assert that WhatsApp message is the sketch consult message without "מחיר הקעקוע: ₪0"
    const lastMsg = sentMessages[sentMessages.length - 1]!
    expect(lastMsg.body).toContain('פרטי פגישת הייעוץ:')
    expect(lastMsg.body).not.toContain('מחיר הקעקוע:')
  })

  it('does NOT treat a tattoo appointment as sketch merely because description contains "סקיצה", and rejects price 0', async () => {
    const mockTattooWithSketchWord = {
      id: 'apt_tattoo_desc_sketch',
      type: 'tattoo',
      tattoo_description: 'קעקוע גוקו לפי סקיצה צבעונית',
      start_time: '2026-09-27T10:00:00.000Z',
      duration_minutes: 120,
      staff: 'staff_shahar',
      expand: {
        customer: { id: 'cust_roee', phone: '0501234567', health_declaration_signed: true },
        staff: { name: 'שחר אזולאי' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockTattooWithSketchWord),
            update: vi.fn(),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_roee',
              state: 'AWAIT_PRICE_OFFER',
              whatsapp_window_expires_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    // Attempting to send 0 price should throw
    await expect(
      sendPriceQuoteToCustomerHandler({
        appointmentId: 'apt_tattoo_desc_sketch',
        priceMinIls: 0,
        priceMaxIls: 0,
        depositAmount: 150,
      }),
    ).rejects.toThrow('יש להזין טווח מחירים תקין (גבוה מ-0) עבור תור לקעקוע.')
  })

  it('rejects sending a price quote if the appointment is already confirmed', async () => {
    const mockConfirmedAppointment = {
      id: 'apt_already_confirmed',
      type: 'tattoo',
      status: 'confirmed',
      start_time: '2026-09-27T10:00:00.000Z',
      duration_minutes: 120,
      expand: {
        customer: { id: 'cust_roee', phone: '0501234567' },
      },
    }

    const mockPb = {
      collection: vi.fn((col: string) => {
        if (col === 'appointments') {
          return {
            getOne: vi.fn().mockResolvedValue(mockConfirmedAppointment),
          }
        }
        if (col === 'conversations') {
          return {
            getFirstListItem: vi.fn().mockResolvedValue({
              id: 'conv_roee',
              state: 'AWAITING_APPOINTMENT',
            }),
          }
        }
        return { getOne: vi.fn(), update: vi.fn() }
      }),
    }

    vi.mocked(pbModule.getSuperuserClient).mockResolvedValue(mockPb as never)

    await expect(
      sendPriceQuoteToCustomerHandler({
        appointmentId: 'apt_already_confirmed',
        priceMinIls: 1000,
        priceMaxIls: 1200,
        depositAmount: 150,
      }),
    ).rejects.toThrow('התור כבר אושר ונסגר ביומן. לא ניתן לשלוח הצעת מחיר ראשונית לתור סגור.')
  })
})
