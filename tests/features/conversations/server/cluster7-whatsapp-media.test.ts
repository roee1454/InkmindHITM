import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createWhatsAppClient,
  WhatsAppApiError,
  ERROR_REENGAGEMENT_REQUIRED,
  isRetryableError,
} from '@/integrations/whatsapp-cloud-api/client'
import { parseWebhookPayload } from '@/integrations/whatsapp-cloud-api/webhook'
import { transcribeAudioWithGroq, DEFAULT_WHISPER_PROMPT } from '@/integrations/audio/server/groq-whisper'
import { phoneLock } from '@/lib/async-lock'
import { dispatchLifecycleMessage, LIFECYCLE_TEMPLATE_MAP } from '@/features/lifecycle/server/lifecycle-service'
import { parseTemplateParameters } from '@/features/conversations/server/messages'
import { determineMediaCategory } from '@/features/conversations/server/webhook'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'

vi.mock('@/integrations/whatsapp-cloud-api/settings.server', () => ({
  getWhatsAppSettings: vi.fn(async () => ({
    phoneNumberId: 'PN_TEST',
    accessToken: 'TOKEN_123',
  })),
}))

describe('Cluster 7: Webhook, WhatsApp Cloud API, Audio & Media Audit', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // --------------------------------------------------------------------------
  // Bug 50 & Bug 35: sendTemplate support & Exponential Backoff Retries
  // --------------------------------------------------------------------------
  describe('Bug 50 & Bug 35: WhatsApp client sendTemplate & retries', () => {
    it('Bug 50: sendTemplate generates valid Meta Graph API template payload', async () => {
      let capturedBody: any = null
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, opts: any) => {
          capturedBody = JSON.parse(opts.body)
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.TEMPLATE_123' }] }), { status: 200 })
        }),
      )

      const client = createWhatsAppClient({ phoneNumberId: 'PN_TEST', accessToken: 'TOKEN_123' })
      const res = await client.sendTemplate({
        to: '972501234567',
        templateName: 'appointment_reminder_3d',
        languageCode: 'he',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'דניאל' },
              { type: 'text', text: 'יום שלישי 24/10' },
            ],
          },
        ],
      })

      expect(res.wamid).toBe('wamid.TEMPLATE_123')
      expect(capturedBody).toMatchObject({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: '972501234567',
        type: 'template',
        template: {
          name: 'appointment_reminder_3d',
          language: { code: 'he' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'דניאל' },
                { type: 'text', text: 'יום שלישי 24/10' },
              ],
            },
          ],
        },
      })
    })

    it('Bug 35: Retries with backoff on transient 500 error and succeeds on subsequent attempt', async () => {
      let attempts = 0
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          attempts++
          if (attempts < 3) {
            return new Response('Internal Server Error', { status: 500 })
          }
          return new Response(JSON.stringify({ messages: [{ id: 'wamid.RETRY_SUCCESS' }] }), { status: 200 })
        }),
      )

      const client = createWhatsAppClient(
        { phoneNumberId: 'PN_TEST', accessToken: 'TOKEN_123' },
        { retryDelays: [1, 1, 1] }, // fast in test
      )

      const res = await client.sendText({ to: '972501234567', body: 'בדיקת רשת' })
      expect(res.wamid).toBe('wamid.RETRY_SUCCESS')
      expect(attempts).toBe(3)
    })

    it('Bug 35: Does NOT retry permanent 400 client errors (e.g. 131047 24h window)', async () => {
      let attempts = 0
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          attempts++
          return new Response(
            JSON.stringify({
              error: {
                message: 'Message sent outside 24 hours window',
                code: ERROR_REENGAGEMENT_REQUIRED,
                type: 'OAuthException',
              },
            }),
            { status: 400 },
          )
        }),
      )

      const client = createWhatsAppClient(
        { phoneNumberId: 'PN_TEST', accessToken: 'TOKEN_123' },
        { retryDelays: [1, 1, 1] },
      )

      await expect(client.sendText({ to: '972501234567', body: 'שלום' })).rejects.toThrow(WhatsAppApiError)
      expect(attempts).toBe(1) // failed fast without retry!
    })

    it('isRetryableError correctly identifies 5xx and network errors vs 4xx errors', () => {
      expect(isRetryableError(new WhatsAppApiError('500 error', 500, null, 500))).toBe(true)
      expect(isRetryableError(new WhatsAppApiError('429 rate limit', 429, null, 429))).toBe(true)
      expect(isRetryableError(new TypeError('fetch failed'))).toBe(true)

      expect(isRetryableError(new WhatsAppApiError('Window closed', 131047, null, 400))).toBe(false)
      expect(isRetryableError(new WhatsAppApiError('Invalid parameter', 100, null, 400))).toBe(false)
    })
  })

  // --------------------------------------------------------------------------
  // Bug 31: Reaction Inbound Parsing
  // --------------------------------------------------------------------------
  describe('Bug 31: WhatsApp Reaction events', () => {
    it('parses reaction event with type "reaction" and links to target message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '12345',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '123', phone_number_id: 'PN_TEST' },
                  contacts: [{ profile: { name: 'שירה' }, wa_id: '972541112233' }],
                  messages: [
                    {
                      from: '972541112233',
                      id: 'wamid.REACTION_1',
                      timestamp: '1700000000',
                      type: 'reaction',
                      reaction: {
                        message_id: 'wamid.TARGET_BOT_MSG',
                        emoji: '❤️',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }

      const events = parseWebhookPayload(payload)
      expect(events).toHaveLength(1)
      const ev = events[0]!
      expect(ev.kind).toBe('message')
      if (ev.kind === 'message') {
        expect(ev.message.type).toBe('reaction')
        expect(ev.message.body).toBe('❤️')
        expect(ev.message.replyToWamid).toBe('wamid.TARGET_BOT_MSG')
      }
    })

    it('parses reaction removal with type "reaction" and empty body', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '12345',
            changes: [
              {
                field: 'messages',
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '123', phone_number_id: 'PN_TEST' },
                  contacts: [{ profile: { name: 'שירה' }, wa_id: '972541112233' }],
                  messages: [
                    {
                      from: '972541112233',
                      id: 'wamid.REACTION_REMOVE',
                      timestamp: '1700000010',
                      type: 'reaction',
                      reaction: {
                        message_id: 'wamid.TARGET_BOT_MSG',
                        emoji: '',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      }

      const events = parseWebhookPayload(payload)
      expect(events).toHaveLength(1)
      const ev = events[0]!
      if (ev.kind === 'message') {
        expect(ev.message.type).toBe('reaction')
        expect(ev.message.body).toBe('')
      }
    })
  })

  // --------------------------------------------------------------------------
  // Bug 32 & Bug 52: Groq Whisper Auto-detect & Studio Prompt
  // --------------------------------------------------------------------------
  describe('Bug 32 & Bug 52: Groq Whisper speech-to-text', () => {
    beforeEach(() => {
      process.env.GROQ_API_KEY = 'gsk_test_key_123'
    })

    it('Bug 32: Does not force language: he in FormData allowing multi-lingual auto-detection', async () => {
      const appendedFormData: Map<string, any> = new Map()
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, opts: any) => {
          const fd = opts.body as FormData
          // In Node test environment, read entries
          for (const [key, val] of (fd as any).entries()) {
            appendedFormData.set(key, val)
          }
          return new Response(JSON.stringify({ text: 'Hello, I want to book a tattoo appointment' }), { status: 200 })
        }),
      )

      const blob = new Blob(['audio-data'], { type: 'audio/ogg' })
      const result = await transcribeAudioWithGroq(blob)

      expect(result).toBe('Hello, I want to book a tattoo appointment')
      // Bug 32 verified: language is NOT forced to 'he'
      expect(appendedFormData.has('language')).toBe(false)
    })

    it('Bug 52: Uses clean tattoo studio terminology prompt without outdated artist names', async () => {
      let promptSent = ''
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, opts: any) => {
          const fd = opts.body as FormData
          promptSent = (fd as any).get('prompt')
          return new Response(JSON.stringify({ text: 'קעקוע' }), { status: 200 })
        }),
      )

      const blob = new Blob(['audio-data'], { type: 'audio/ogg' })
      await transcribeAudioWithGroq(blob)

      expect(promptSent).toBe(DEFAULT_WHISPER_PROMPT)
      // Verify outdated/fictitious names are completely gone
      expect(promptSent).not.toContain('דור')
      expect(promptSent).not.toContain('גאיה')
      expect(promptSent).not.toContain('דולב')
      // Verify studio tattoo terms are present
      expect(promptSent).toContain('סטודיו קעקועים אינקמיינד')
      expect(promptSent).toContain('סקיצה')
      expect(promptSent).toContain('פיין ליין')
      expect(promptSent).toContain('Inkmind Tattoo')
    })
  })

  // --------------------------------------------------------------------------
  // Bug 33: Concurrent Webhook Race Condition Prevention (phoneLock)
  // --------------------------------------------------------------------------
  describe('Bug 33: Concurrent webhook locking with phoneLock', () => {
    it('serializes parallel calls for the same phone number to prevent duplicate customer creation', async () => {
      const callOrder: string[] = []
      let customerCreatedCount = 0

      const runSimulatedWebhook = async (id: string) => {
        return phoneLock.runExclusive('+972509998877', async () => {
          callOrder.push(`start-${id}`)
          // Simulate DB lookup and creation delay
          await new Promise((resolve) => setTimeout(resolve, 30))
          customerCreatedCount++
          callOrder.push(`end-${id}`)
          return `done-${id}`
        })
      }

      // Fire 2 concurrent webhook requests simultaneously
      const results = await Promise.all([
        runSimulatedWebhook('req1'),
        runSimulatedWebhook('req2'),
      ])

      expect(results).toEqual(['done-req1', 'done-req2'])
      // Strict serialization: req1 completely finishes before req2 starts!
      expect(callOrder).toEqual(['start-req1', 'end-req1', 'start-req2', 'end-req2'])
      expect(customerCreatedCount).toBe(2)
    })
  })

  // --------------------------------------------------------------------------
  // Bug 30: Lifecycle Reminders Outside 24h Window & Template Fallback
  // --------------------------------------------------------------------------
  describe('Bug 30: Lifecycle template fallback outside 24h window', () => {
    it('maps lifecycle trigger names to approved template names', () => {
      expect(LIFECYCLE_TEMPLATE_MAP['reminder_3d']).toBe('appointment_reminder_3d')
      expect(LIFECYCLE_TEMPLATE_MAP['reminder_1d']).toBe('appointment_reminder_1d')
      expect(LIFECYCLE_TEMPLATE_MAP['aftercare']).toBe('aftercare_check')
      expect(LIFECYCLE_TEMPLATE_MAP['healing_check']).toBe('aftercare_check')
    })

    it('falls back to sendTemplate when sendText fails with 131047 (window closed)', async () => {
      let textAttempts = 0
      let templateSent = false
      let capturedTemplateParams: any = null

      // Mock PocketBase superuser
      const messagesCreated: any[] = []
      const mockSu = {
        collection: (col: string) => ({
          getFirstListItem: vi.fn(async () => ({ id: 'conv_123' })),
          create: vi.fn(async (data: any) => {
            if (col === 'messages') messagesCreated.push(data)
            return { id: `rec_${Date.now()}`, ...data }
          }),
          update: vi.fn(async () => ({})),
        }),
      } as unknown as PocketBase

      const mockCustomer = {
        id: 'cust_123',
        name: 'דניאל ישראלי',
        phone: '0501234567',
      } as unknown as RecordModel

      // Mock fetch: sendText fails with 131047, sendTemplate succeeds
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url: string, opts: any) => {
          const body = JSON.parse(opts.body)
          if (body.type === 'text') {
            textAttempts++
            return new Response(
              JSON.stringify({
                error: {
                  message: 'Re-engagement message required',
                  code: ERROR_REENGAGEMENT_REQUIRED,
                  type: 'OAuthException',
                },
              }),
              { status: 400 },
            )
          }
          if (body.type === 'template') {
            templateSent = true
            capturedTemplateParams = body.template
            return new Response(JSON.stringify({ messages: [{ id: 'wamid.TEMPLATE_OK' }] }), { status: 200 })
          }
          return new Response('{}', { status: 200 })
        }),
      )



      const ok = await dispatchLifecycleMessage({
        su: mockSu,
        customer: mockCustomer,
        staffName: 'יובל',
        messageBody: 'תזכורת תור בעוד 3 ימים',
        triggerName: 'reminder_3d',
        templateName: 'appointment_reminder_3d',
        templateComponents: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'דניאל ישראלי' },
              { type: 'text', text: 'יום שלישי' },
              { type: 'text', text: '14:00' },
              { type: 'text', text: 'יובל' },
            ],
          },
        ],
      })

      expect(ok).toBe(true)
      expect(textAttempts).toBe(1)
      expect(templateSent).toBe(true)
      expect(capturedTemplateParams.name).toBe('appointment_reminder_3d')
      expect(capturedTemplateParams.components[0].parameters[0].text).toBe('דניאל ישראלי')

      // Check persisted message type is template
      const templateMsg = messagesCreated.find((m) => m.type === 'template')
      expect(templateMsg).toBeDefined()
      expect(templateMsg.whatsapp_message_id).toBe('wamid.TEMPLATE_OK')
    })
  })

  // --------------------------------------------------------------------------
  // Meta Approved Templates Fetching & Parameter Parsing
  // --------------------------------------------------------------------------
  describe('Meta Approved Templates Fetching & Parameter Parsing', () => {
    it('parseTemplateParameters parses known studio templates with rich Hebrew labels', () => {
      const body = 'היי {{1}}! מזכירים שיש לך תור בעוד 3 ימים (ב-{{2}} בשעה {{3}}) אצל {{4}} ✨'
      const params = parseTemplateParameters('appointment_reminder_3d', body)
      expect(params).toHaveLength(4)
      expect(params[0]!.label).toBe('שם הלקוח/ה')
      expect(params[0]!.index).toBe(1)
      expect(params[1]!.label).toBe('יום ותאריך התור')
      expect(params[1]!.index).toBe(2)
      expect(params[2]!.label).toBe('שעת התור')
      expect(params[3]!.label).toBe('שם המקעקע/ת')
    })

    it('parseTemplateParameters handles unknown/custom templates and uses example placeholders', () => {
      const body = 'Order {{2}} has been confirmed for customer {{1}}!'
      const examples = ['Daniel', 'ORD-999']
      const params = parseTemplateParameters('custom_order_template', body, examples)
      expect(params).toHaveLength(2)
      // Indexes are sorted: 1 then 2
      expect(params[0]!.index).toBe(1)
      expect(params[0]!.label).toBe('פרמטר {{1}}')
      expect(params[0]!.placeholder).toBe('למשל: Daniel')
      expect(params[1]!.index).toBe(2)
      expect(params[1]!.label).toBe('פרמטר {{2}}')
      expect(params[1]!.placeholder).toBe('למשל: ORD-999')
    })

    it('parseTemplateParameters returns empty array for static templates', () => {
      const body = 'Welcome to our studio!'
      const params = parseTemplateParameters('hello_world', body)
      expect(params).toEqual([])
    })

    it('getApprovedTemplates queries Graph API with status=APPROVED and filters non-approved templates', async () => {
      let calledUrl = ''
      let authHeader = ''

      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string, opts: any) => {
          calledUrl = url
          authHeader = opts?.headers?.Authorization
          return new Response(
            JSON.stringify({
              data: [
                { id: '1', name: 'tpl_approved_1', status: 'APPROVED', category: 'UTILITY', language: 'he' },
                { id: '2', name: 'tpl_pending', status: 'PENDING', category: 'UTILITY', language: 'he' },
                { id: '3', name: 'tpl_approved_2', status: 'APPROVED', category: 'MARKETING', language: 'en_US' },
                { id: '4', name: 'tpl_rejected', status: 'REJECTED', category: 'UTILITY', language: 'he' },
              ],
            }),
            { status: 200 },
          )
        }),
      )

      const client = createWhatsAppClient({
        phoneNumberId: 'PN_123',
        accessToken: 'TOKEN_XYZ',
        businessAccountId: 'WABA_456',
      })

      const templates = await client.getApprovedTemplates()
      expect(calledUrl).toContain('https://graph.facebook.com/v21.0/WABA_456/message_templates?status=APPROVED')
      expect(authHeader).toBe('Bearer TOKEN_XYZ')
      expect(templates).toHaveLength(2)
      expect(templates.map((t) => t.name)).toEqual(['tpl_approved_1', 'tpl_approved_2'])
    })

    it('getApprovedTemplates throws error when businessAccountId is missing', async () => {
      const client = createWhatsAppClient({
        phoneNumberId: 'PN_123',
        accessToken: 'TOKEN_XYZ',
      })
      await expect(client.getApprovedTemplates()).rejects.toThrow(
        'חסר מזהה חשבון עסקי (WHATSAPP_BUSINESS_ACCOUNT_ID) למשיכת תבניות.',
      )
    })
  })

  // --------------------------------------------------------------------------
  // Deterministic Media Classification (Inspiration vs. Verification)
  // --------------------------------------------------------------------------
  describe('Deterministic Media Classification (Inspiration vs. Verification)', () => {
    it('returns null for text messages', () => {
      expect(determineMediaCategory('text', 'COLLECTING_INFO', 'שלום')).toBeNull()
      expect(determineMediaCategory('text', 'AWAIT_PAYMENT', 'הנה האסמכתא')).toBeNull()
    })

    it('classifies images during intake stages as inspiration', () => {
      expect(determineMediaCategory('image', 'NEW')).toBe('inspiration')
      expect(determineMediaCategory('image', 'WANTS_TO_BOOK')).toBe('inspiration')
      expect(determineMediaCategory('image', 'COLLECTING_INFO', 'משהו כזה על הזרוע')).toBe('inspiration')
      expect(determineMediaCategory('image', 'WAITLIST')).toBe('inspiration')
      expect(determineMediaCategory('image', 'AWAIT_PRICE_OFFER')).toBe('inspiration')
      expect(determineMediaCategory('image', 'AWAIT_HEALTH_NOTICE')).toBe('inspiration')
    })

    it('classifies inbound media during AWAIT_PAYMENT as verification (receipt)', () => {
      expect(determineMediaCategory('image', 'AWAIT_PAYMENT')).toBe('verification')
      expect(determineMediaCategory('image', 'AWAIT_PAYMENT', '')).toBe('verification')
    })

    it('classifies documents as verification even during intake stages', () => {
      expect(determineMediaCategory('document', 'COLLECTING_INFO')).toBe('verification')
    })

    it('classifies images with receipt keywords as verification even outside AWAIT_PAYMENT', () => {
      expect(determineMediaCategory('image', 'COLLECTING_INFO', 'הנה הקבלה')).toBe('verification')
      expect(determineMediaCategory('image', 'NEW', 'שילמתי בביט עכשיו')).toBe('verification')
      expect(determineMediaCategory('image', 'WANTS_TO_BOOK', 'העברתי את המקדמה')).toBe('verification')
    })
  })
})

