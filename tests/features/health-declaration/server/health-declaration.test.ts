import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractPhoneCandidates,
  healthDeclarationInputSchema,
  isValidHealthWebhookSecret,
  processHealthDeclaration,
  toCanonicalE164Phone,
} from '@/features/health-declaration/server/health-service'

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn().mockResolvedValue({
    phoneNumberId: 'phone_123',
    accessToken: 'token_abc',
    verifyToken: 'verify_123',
    appSecret: 'secret_123',
  }),
}))

const mockSendText = vi.fn().mockResolvedValue({ wamid: 'wamid.text.123' })
const mockSendTemplate = vi.fn().mockResolvedValue({ wamid: 'wamid.tpl.123' })

vi.mock('@/integrations/whatsapp-cloud-api/client', () => ({
  createWhatsAppClient: vi.fn(() => ({
    sendText: mockSendText,
    sendTemplate: mockSendTemplate,
  })),
  WhatsAppApiError: class WhatsAppApiError extends Error {
    constructor(
      message: string,
      readonly code: number | null = null,
    ) {
      super(message)
    }
  },
}))

vi.mock('@/features/calendar/server/bot-appointments.server', () => ({
  getActiveAppointmentForBot: vi.fn().mockImplementation(async (su, customerId) => {
    return su._data.appointments?.find(
      (a: { customer: string; status: string }) =>
        a.customer === customerId && a.status === 'pending',
    ) || null
  }),
}))

vi.mock('@/features/notifications/server/notifications', () => ({
  addSystemNotification: vi.fn().mockResolvedValue({ id: 'notif_1' }),
}))

describe('Health Declaration Integration', () => {
  const originalEnv = process.env.HEALTH_DECLARATION_WEBHOOK_SECRET

  afterAll(() => {
    process.env.HEALTH_DECLARATION_WEBHOOK_SECRET = originalEnv
  })

  beforeEach(() => {
    process.env.HEALTH_DECLARATION_WEBHOOK_SECRET = 'test-secret-123'
    vi.clearAllMocks()
  })

  describe('Secret Verification (Constant-Time)', () => {
    it('accepts exact match', () => {
      expect(isValidHealthWebhookSecret('test-secret-123')).toBe(true)
    })

    it('rejects wrong secret', () => {
      expect(isValidHealthWebhookSecret('wrong-secret')).toBe(false)
    })

    it('rejects null or empty secret', () => {
      expect(isValidHealthWebhookSecret(null)).toBe(false)
      expect(isValidHealthWebhookSecret('')).toBe(false)
    })

    it('allows any request if no webhook secret is configured in env', () => {
      delete process.env.HEALTH_DECLARATION_WEBHOOK_SECRET
      expect(isValidHealthWebhookSecret(null)).toBe(true)
      expect(isValidHealthWebhookSecret('')).toBe(true)
      expect(isValidHealthWebhookSecret('anything')).toBe(true)
    })
  })

  describe('Phone Normalization & Candidate Generation', () => {
    it('extracts Israeli local mobile candidates correctly', () => {
      const candidates = extractPhoneCandidates('050-123-4567')
      expect(candidates).toContain('+972501234567')
      expect(candidates).toContain('972501234567')
      expect(candidates).toContain('0501234567')
      expect(candidates).toContain('050-123-4567')
    })

    it('extracts international +972 candidates correctly', () => {
      const candidates = extractPhoneCandidates('+972528114746')
      expect(candidates).toContain('+972528114746')
      expect(candidates).toContain('972528114746')
      expect(candidates).toContain('0528114746')
    })

    it('converts to canonical E.164 with leading +', () => {
      expect(toCanonicalE164Phone('050-123-4567')).toBe('+972501234567')
      expect(toCanonicalE164Phone('+972528114746')).toBe('+972528114746')
      expect(toCanonicalE164Phone('972501112233')).toBe('+972501112233')
    })
  })

  describe('Payload Parsing (CamelCase & Snake_Case)', () => {
    it('parses snake_case Google Apps Script payload', () => {
      const input = {
        name: 'דניאל כהן',
        phone: '054-9988776',
        age_confirmed: true,
        allergies: 'לטקס, אלכוהול רפואי',
        medical_conditions: 'סוכרת סוג 1',
        medications: 'אינסולין',
        terms_accepted: true,
        form_response_id: 'resp_abc_123',
        form_url: 'https://docs.google.com/forms/d/e/viewform',
        submitted_at: '2026-09-17T12:00:00.000Z',
      }

      const parsed = healthDeclarationInputSchema.parse(input)
      expect(parsed.name).toBe('דניאל כהן')
      expect(parsed.phone).toBe('054-9988776')
      expect(parsed.allergies).toBe('לטקס, אלכוהול רפואי')
      expect(parsed.medicalConditions).toBe('סוכרת סוג 1')
      expect(parsed.formUrl).toBe('https://docs.google.com/forms/d/e/viewform')
    })

    it('parses camelCase payload', () => {
      const input = {
        name: 'שירה לוי',
        phone: '052-1122334',
        ageConfirmed: true,
        allergies: 'אין',
        medicalConditions: 'אין',
        medications: 'ללא',
      }

      const parsed = healthDeclarationInputSchema.parse(input)
      expect(parsed.name).toBe('שירה לוי')
      expect(parsed.allergies).toBe('אין')
    })

    it('parses Hebrew Google Form webhook payload with exact studio questions', () => {
      const googleFormSubmission = {
        'שם מלא': 'ישראל ישראלי',
        'תעודת זהות': '123456789',
        'סוג השאלה': 'כללי',
        'מספר טלפון נייד': '050-1234567',
        'תאריך לידה': '01/01/1995',
        'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': 'סוכרת, אפילפסיה',
        'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'אספירין',
        'האם את בהריון או תקופת הנקה?': 'לא',
        'האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?': 'לא',
        'חתימה דיגיטלית או אישור הצהרה': 'מאשר/ת',
      }

      const parsed = healthDeclarationInputSchema.parse(googleFormSubmission)
      expect(parsed.name).toBe('ישראל ישראלי')
      expect(parsed.phone).toBe('050-1234567')
      expect(parsed.idNumber).toBe('123456789')
      expect(parsed.birthDate).toBe('01/01/1995')
      expect(parsed.medicalConditions).toBe('סוכרת, אפילפסיה')
      expect(parsed.medications).toBe('אספירין')
      expect(parsed.isPregnantOrNursing).toBe('לא')
      expect(parsed.alcoholOrDrugs24h).toBe('לא')
      expect(parsed.signature).toBe('מאשר/ת')
      expect(parsed.termsAccepted).toBe(true)
    })

    it('parses real submission with array response (Checkbox) and builds notes dynamically', () => {
      const realSubmission = {
        'שם מלא': 'רואי חיילי',
        'תעודת זהות': '214650590',
        'מספר טלפון נייד': '0527051611',
        'תאריך לידה': '2004-10-24',
        'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': ['אין מן האמור לעיל'],
        'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'לא',
        'האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?': 'לא',
        'חתימה דיגיטלית או אישור הצהרה': 'רואי חיילי',
        'timestamp': '2026-09-22T15:38:06.232Z',
        'form_response_id': '2_ABaOnuf6oqYudE6rEFNVOc5fNlNqiF8u8YCTlOz',
        'form_url': 'https://docs.google.com/forms/viewform',
      }

      const parsed = healthDeclarationInputSchema.parse(realSubmission)
      expect(parsed.name).toBe('רואי חיילי')
      expect(parsed.phone).toBe('0527051611')
      expect(parsed.notes).toContain('תעודת זהות: 214650590')
      expect(parsed.notes).toContain('האם אתה סובל מאחת מהבעיות הרפואיות הבאות?: אין מן האמור לעיל')
      expect(parsed.notes).toContain('האם אתה נוטל תדרויות באופן קבוע או מדללי דם?: לא')
      expect(parsed.notes).toContain('חתימה דיגיטלית או אישור הצהרה: רואי חיילי')
    })

    it('handles zero-code dynamic questions without any code changes', () => {
      const futureSubmission = {
        'שם מלא': 'דן ארז',
        'מספר טלפון נייד': '050-9988776',
        'האם יש לך קעקועים קודמים?': 'כן, שניים',
        'אזורים רגישים': ['צוואר', 'צלעות'],
      }

      const parsed = healthDeclarationInputSchema.parse(futureSubmission)
      expect(parsed.name).toBe('דן ארז')
      expect(parsed.phone).toBe('050-9988776')
      expect(parsed.notes).toContain('האם יש לך קעקועים קודמים?: כן, שניים')
      expect(parsed.notes).toContain('אזורים רגישים: צוואר, צלעות')
    })
  })

  describe('processHealthDeclaration Workflow & 24h Window', () => {
    function createMockPocketBase(initialData: {
      customers?: any[]
      appointments?: any[]
      conversations?: any[]
      messages?: any[]
      audit_log?: any[]
    }) {
      const db = {
        customers: [...(initialData.customers || [])],
        appointments: [...(initialData.appointments || [])],
        conversations: [...(initialData.conversations || [])],
        messages: [...(initialData.messages || [])],
        audit_log: [...(initialData.audit_log || [])],
      }

      return {
        _data: db,
        filter: (expr: string, params: Record<string, string>) => {
          return { expr, params }
        },
        collection: (name: string) => ({
          getFirstListItem: async (filterObj: any, _opts?: any) => {
            const table = db[name as keyof typeof db] || []
            if (name === 'customers') {
              const phone = filterObj.params?.phone
              const found = table.find(
                (c) => c.phone === phone || c.whatsapp_chat_id === phone,
              )
              if (!found) throw new Error('Not found')
              return found
            }
            if (name === 'appointments') {
              const cid = filterObj.params?.cid
              const found = table.find((a) => a.customer === cid && a.status !== 'cancelled')
              if (!found) throw new Error('Not found')
              return found
            }
            if (name === 'conversations') {
              const cid = filterObj.params?.cid
              const found = table.find((cv) => cv.customer === cid)
              if (!found) throw new Error('Not found')
              return found
            }
            throw new Error('Not found')
          },
          getOne: async (id: string) => {
            const table = db[name as keyof typeof db] || []
            const found = table.find((x) => x.id === id)
            if (!found) throw new Error('Not found')
            return found
          },
          create: async (data: any) => {
            const record = { id: `${name}_${Date.now()}_${Math.random()}`, ...data }
            db[name as keyof typeof db].push(record)
            return record
          },
          update: async (id: string, data: any) => {
            const table = db[name as keyof typeof db] || []
            const index = table.findIndex((x) => x.id === id)
            if (index === -1) throw new Error('Not found')
            table[index] = { ...table[index], ...data }
            return table[index]
          },
        }),
      } as any
    }

    it('Branch A: when 24h window is OPEN, sends free-form WhatsApp text (0 ₪) and transitions state', async () => {
      const su = createMockPocketBase({
        customers: [
          {
            id: 'cust_1',
            name: 'נועה ברק',
            phone: '+972501234567',
            whatsapp_chat_id: '+972501234567',
          },
        ],
        appointments: [
          {
            id: 'appt_1',
            customer: 'cust_1',
            status: 'pending',
            start_time: '2026-10-01T10:00:00.000Z',
          },
        ],
        conversations: [
          {
            id: 'conv_1',
            customer: 'cust_1',
            state: 'AWAIT_HEALTH_NOTICE',
            // Window expires in 4 hours
            whatsapp_window_expires_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          },
        ],
      })

      const payload = healthDeclarationInputSchema.parse({
        name: 'נועה ברק',
        phone: '050-123-4567',
        allergies: 'לטקס',
        medical_conditions: 'אין',
        medications: 'אין',
        form_url: 'https://form.test/view',
      })

      const result = await processHealthDeclaration(su, payload)

      expect(result.customer.id).toBe('cust_1')
      expect(result.appointment?.id).toBe('appt_1')
      expect(result.stateTransitioned).toBe(true)

      // Appointment marked signed
      expect(su._data.appointments[0].health_declaration_signed).toBe(true)
      expect(su._data.appointments[0].health_declaration_url).toBe('https://form.test/view')

      // Conversation transitioned to AWAIT_PAYMENT
      expect(su._data.conversations[0].state).toBe('AWAIT_PAYMENT')

      // Free text message sent (0.00 ₪)
      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+972501234567',
          body: expect.stringContaining('הצהרת הבריאות נקלטה בהצלחה'),
        }),
      )
      expect(result.messageDelivery.type).toBe('free_text')
      expect(result.messageDelivery.success).toBe(true)
      expect(su._data.messages).toHaveLength(1)
    })

    it('Branch B: when 24h window is CLOSED, avoids 131047 error and creates staff alert', async () => {
      const su = createMockPocketBase({
        customers: [
          {
            id: 'cust_2',
            name: 'יוסי כהן',
            phone: '+972528889900',
            whatsapp_chat_id: '+972528889900',
          },
        ],
        appointments: [
          {
            id: 'appt_2',
            customer: 'cust_2',
            status: 'pending',
            start_time: '2026-10-05T12:00:00.000Z',
          },
        ],
        conversations: [
          {
            id: 'conv_2',
            customer: 'cust_2',
            state: 'AWAIT_HEALTH_NOTICE',
            // Window expired 10 hours ago
            whatsapp_window_expires_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
          },
        ],
      })

      const payload = healthDeclarationInputSchema.parse({
        name: 'יוסי כהן',
        phone: '052-888-9900',
        allergies: 'אין',
      })

      const result = await processHealthDeclaration(su, payload)

      expect(result.customer.id).toBe('cust_2')
      expect(result.appointment?.health_declaration_signed).toBe(true)

      // sendText was NOT called (preventing 131047 error)
      expect(mockSendText).not.toHaveBeenCalled()
      expect(mockSendTemplate).not.toHaveBeenCalled()

      expect(result.messageDelivery.type).toBe('window_closed_alert')
      expect(result.messageDelivery.success).toBe(true)
    })

    it('creates new customer record if phone is not yet in the system', async () => {
      const su = createMockPocketBase({
        customers: [],
        appointments: [],
        conversations: [],
      })

      const payload = healthDeclarationInputSchema.parse({
        name: 'אורן חדש',
        phone: '053-4455667',
        allergies: 'אבק',
      })

      const result = await processHealthDeclaration(su, payload)
      expect(result.customer.name).toBe('אורן חדש')
      expect(result.customer.phone).toBe('+972534455667')
      expect(result.customer.allergies).toBe('אבק')
      expect(result.appointment).toBeNull()
      expect(result.stateTransitioned).toBe(false)
    })

    it('processes Hebrew Google Form submission end-to-end, updates medical notes, transitions to AWAIT_PAYMENT and sends WhatsApp', async () => {
      const su = createMockPocketBase({
        customers: [
          {
            id: 'cust_google',
            name: 'ישראל ישראלי',
            phone: '+972501234567',
            whatsapp_chat_id: '+972501234567',
          },
        ],
        appointments: [
          {
            id: 'appt_google',
            customer: 'cust_google',
            status: 'pending',
            deposit_amount: 200,
            start_time: '2026-10-15T12:00:00.000Z',
          },
        ],
        conversations: [
          {
            id: 'conv_google',
            customer: 'cust_google',
            state: 'AWAIT_HEALTH_NOTICE',
            whatsapp_window_expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          },
        ],
      })

      const googleFormSubmission = {
        'שם מלא': 'ישראל ישראלי',
        'תעודת זהות': '123456789',
        'מספר טלפון נייד': '050-1234567',
        'תאריך לידה': '01/01/1995',
        'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': 'סוכרת',
        'האם אתה נוטל תדרויות באופן קבוע או מדללי דם?': 'אספירין',
        'האם את בהריון או תקופת הנקה?': 'לא',
        'האם השתמשת באלכוהול או בסמים ב-24 השעות האחרונות?': 'לא',
        'חתימה דיגיטלית או אישור הצהרה': 'מאשר/ת',
      }

      const payload = healthDeclarationInputSchema.parse(googleFormSubmission)
      const result = await processHealthDeclaration(su, payload)

      expect(result.customer.id).toBe('cust_google')
      expect(result.customer.health_declaration_signed).toBe(true)
      expect(result.customer.medical_notes).toContain('תעודת זהות: 123456789')
      expect(result.customer.medical_notes).toContain('האם אתה סובל מאחת מהבעיות הרפואיות הבאות?: סוכרת')
      expect(result.customer.medical_notes).toContain('האם אתה נוטל תדרויות באופן קבוע או מדללי דם?: אספירין')
      expect(result.customer.medical_notes).toContain('חתימה דיגיטלית או אישור הצהרה: מאשר/ת')

      expect(result.appointment?.health_declaration_signed).toBe(true)
      expect(result.stateTransitioned).toBe(true)
      expect(su._data.conversations[0].state).toBe('AWAIT_PAYMENT')

      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+972501234567',
          body: expect.stringContaining('הצהרת הבריאות נקלטה בהצלחה'),
        }),
      )
      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('200'),
        }),
      )
    })

    it('processes free sketch submission by confirming appointment and transitioning directly to AWAITING_APPOINTMENT', async () => {
      const su = createMockPocketBase({
        customers: [
          {
            id: 'cust_free',
            name: 'דנה שמש',
            phone: '+972529998877',
            whatsapp_chat_id: '+972529998877',
          },
        ],
        appointments: [
          {
            id: 'appt_free',
            customer: 'cust_free',
            type: 'sketch',
            deposit_amount: 0,
            status: 'pending',
            start_time: '2026-10-18T10:00:00.000Z',
          },
        ],
        conversations: [
          {
            id: 'conv_free',
            customer: 'cust_free',
            state: 'AWAIT_HEALTH_NOTICE',
            whatsapp_window_expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
          },
        ],
      })

      const payload = healthDeclarationInputSchema.parse({
        'שם מלא': 'דנה שמש',
        'מספר טלפון נייד': '052-999-8877',
      })
      const result = await processHealthDeclaration(su, payload)

      expect(result.appointment?.status).toBe('confirmed')
      expect(result.appointment?.slot_confirmed).toBe(true)
      expect(su._data.conversations[0].state).toBe('AWAITING_APPOINTMENT')
      expect(mockSendText).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+972529998877',
          body: expect.stringContaining('פגישת הייעוץ מאושרת ביומן'),
        }),
      )
    })

    it('Edge Case: when conversation is CANCELLED (not in AWAIT_HEALTH_NOTICE), updates customer but sends ZERO messages and does NOT advance state', async () => {
      const su = createMockPocketBase({
        customers: [
          {
            id: 'cust_cancelled',
            name: 'רואי חיילי',
            phone: '+972527051611',
            whatsapp_chat_id: '+972527051611',
          },
        ],
        appointments: [
          {
            id: 'appt_cancelled',
            customer: 'cust_cancelled',
            status: 'cancelled',
            start_time: '2026-10-01T10:00:00.000Z',
          },
        ],
        conversations: [
          {
            id: 'conv_cancelled',
            customer: 'cust_cancelled',
            state: 'CANCELLED',
            whatsapp_window_expires_at: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
          },
        ],
      })

      const payload = healthDeclarationInputSchema.parse({
        'שם מלא': 'רואי חיילי',
        'מספר טלפון נייד': '0527051611',
        'תעודת זהות': '214650590',
        'האם אתה סובל מאחת מהבעיות הרפואיות הבאות?': ['אין מן האמור לעיל'],
      })

      const result = await processHealthDeclaration(su, payload)

      // Customer is updated with signed status and notes
      expect(result.customer.id).toBe('cust_cancelled')
      expect(result.customer.health_declaration_signed).toBe(true)
      expect(result.customer.medical_notes).toContain('תעודת זהות: 214650590')

      // State is NOT transitioned
      expect(result.stateTransitioned).toBe(false)
      expect(su._data.conversations[0].state).toBe('CANCELLED')

      // ZERO messages sent to customer!
      expect(mockSendText).not.toHaveBeenCalled()
      expect(mockSendTemplate).not.toHaveBeenCalled()
      expect(su._data.messages).toHaveLength(0)
    })
  })
})

