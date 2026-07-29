import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizePhoneNumber, parseWebhookPayload } from './webhook'
import {
  ERROR_REENGAGEMENT_REQUIRED,
  WhatsAppApiError,
  createWhatsAppClient,
} from './client'

describe('normalizePhoneNumber', () => {
  it('prefixes a bare wa_id with +', () => {
    expect(normalizePhoneNumber('16315551234')).toBe('+16315551234')
  })
  it('leaves an already-E.164 number unchanged', () => {
    expect(normalizePhoneNumber('+16315551234')).toBe('+16315551234')
  })
})

describe('parseWebhookPayload', () => {
  it('parses an inbound text message', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: 'Jane' }, wa_id: '16315551234' }],
                messages: [
                  { from: '16315551234', id: 'wamid.A', timestamp: '1683229471', type: 'text', text: { body: 'Hello' } },
                ],
              },
            },
          ],
        },
      ],
    }
    const events = parseWebhookPayload(payload)
    expect(events).toHaveLength(1)
    const e = events[0]!
    expect(e.kind).toBe('message')
    if (e.kind !== 'message') return
    expect(e.wamid).toBe('wamid.A')
    expect(e.from).toBe('16315551234')
    expect(e.senderName).toBe('Jane')
    expect(e.message.type).toBe('text')
    expect(e.message.body).toBe('Hello')
  })

  it('parses an inbound image with media id and caption', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    from: '16315551234',
                    id: 'wamid.B',
                    timestamp: '1',
                    type: 'image',
                    image: { id: 'MEDIA1', mime_type: 'image/jpeg', caption: 'look' },
                  },
                ],
              },
            },
          ],
        },
      ],
    }
    const e = parseWebhookPayload(payload)[0]!
    if (e.kind !== 'message') throw new Error('expected message')
    expect(e.message.type).toBe('image')
    expect(e.message.body).toBe('look')
    expect(e.message.media).toEqual({ mediaId: 'MEDIA1', mimeType: 'image/jpeg', filename: null })
  })

  it('parses a status update', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  { id: 'wamid.C', status: 'delivered', timestamp: '2', recipient_id: '16315551234' },
                ],
              },
            },
          ],
        },
      ],
    }
    const e = parseWebhookPayload(payload)[0]!
    expect(e.kind).toBe('status')
    if (e.kind !== 'status') return
    expect(e.wamid).toBe('wamid.C')
    expect(e.status).toBe('delivered')
    expect(e.recipientId).toBe('16315551234')
  })

  it('batches multiple events across entries/changes', () => {
    const payload = {
      entry: [
        { changes: [{ value: { messages: [{ from: '1', id: 'w1', timestamp: '1', type: 'text', text: { body: 'a' } }] } }] },
        { changes: [{ value: { statuses: [{ id: 'w1', status: 'read', timestamp: '2' }] } }] },
      ],
    }
    expect(parseWebhookPayload(payload)).toHaveLength(2)
  })

  it('ignores malformed / empty payloads', () => {
    expect(parseWebhookPayload({})).toEqual([])
    expect(parseWebhookPayload({ entry: [{ changes: [{ value: {} }] }] })).toEqual([])
  })

  it('folds template quick-reply button taps into the interactive type', () => {
    const payload = {
      entry: [
        {
          changes: [
            { value: { messages: [{ from: '1', id: 'w', timestamp: '1', type: 'button', button: { text: 'Yes', payload: 'X' } }] } },
          ],
        },
      ],
    }
    const e = parseWebhookPayload(payload)[0]!
    if (e.kind !== 'message') throw new Error('expected message')
    expect(e.message.type).toBe('interactive')
    expect(e.message.body).toBe('Yes')
  })
})

describe('createWhatsAppClient error mapping', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sendText returns the wamid on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.OUT' }] }), { status: 200 })),
    )
    const client = createWhatsAppClient({ phoneNumberId: 'PNID', accessToken: 'T' })
    const res = await client.sendText({ to: '+1', body: 'hi' })
    expect(res.wamid).toBe('wamid.OUT')
  })

  it('surfaces Graph error 131047 as a typed WhatsAppApiError (the 24h-window branch)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { message: 'Re-engagement message', code: ERROR_REENGAGEMENT_REQUIRED, type: 'OAuthException' },
            }),
            { status: 400 },
          ),
      ),
    )
    const client = createWhatsAppClient({ phoneNumberId: 'PNID', accessToken: 'T' })
    await expect(client.sendText({ to: '+1', body: 'hi' })).rejects.toMatchObject({
      name: 'WhatsAppApiError',
      code: ERROR_REENGAGEMENT_REQUIRED,
      httpStatus: 400,
    })
  })

  it('WhatsAppApiError is the error type thrown', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const client = createWhatsAppClient({ phoneNumberId: 'PNID', accessToken: 'T' })
    await expect(client.sendText({ to: '+1', body: 'hi' })).rejects.toBeInstanceOf(WhatsAppApiError)
  })
})
