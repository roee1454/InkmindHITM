import { createHmac } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isValidSignature } from './whatsapp-webhook'

const APP_SECRET = 'test-app-secret'

function sign(rawBody: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
}

describe('isValidSignature', () => {
  it('accepts a correctly-signed body', () => {
    const body = '{"hello":"world"}'
    expect(isValidSignature(body, sign(body, APP_SECRET), APP_SECRET)).toBe(true)
  })

  it('rejects a body signed with the wrong secret', () => {
    const body = '{"hello":"world"}'
    expect(isValidSignature(body, sign(body, 'wrong-secret'), APP_SECRET)).toBe(false)
  })

  it('rejects a tampered body (signature no longer matches)', () => {
    const body = '{"hello":"world"}'
    const signature = sign(body, APP_SECRET)
    expect(isValidSignature('{"hello":"tampered"}', signature, APP_SECRET)).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(isValidSignature('{}', null, APP_SECRET)).toBe(false)
  })

  it('rejects when no app secret is configured', () => {
    const body = '{}'
    expect(isValidSignature(body, sign(body, APP_SECRET), '')).toBe(false)
  })

  it('rejects a malformed header (wrong scheme or non-hex)', () => {
    expect(isValidSignature('{}', 'sha1=deadbeef', APP_SECRET)).toBe(false)
    expect(isValidSignature('{}', 'sha256=not-hex-zz', APP_SECRET)).toBe(false)
  })
})

vi.mock('@/features/conversations/server/webhook', () => ({
  getWhatsAppSettings: vi.fn(),
  processInboundEvent: vi.fn(),
}))

describe('handleWebhookPost', () => {
  afterEach(() => vi.resetAllMocks())

  it('processes a correctly-signed request and returns 200', async () => {
    const { getWhatsAppSettings, processInboundEvent } = await import(
      '@/features/conversations/server/webhook'
    )
    vi.mocked(getWhatsAppSettings).mockResolvedValue({
      id: 's1',
      phoneNumberId: 'PNID',
      accessToken: 'T',
      verifyToken: 'V',
      appSecret: APP_SECRET,
    })
    const { handleWebhookPost } = await import('./whatsapp-webhook')

    const body = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: '1', id: 'wamid.X', timestamp: '1', type: 'text', text: { body: 'hi' } },
                ],
              },
            },
          ],
        },
      ],
    })
    const request = new Request('http://localhost/api/whatsapp-webhook', {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sign(body, APP_SECRET) },
    })

    const res = await handleWebhookPost(request)
    expect(res.status).toBe(200)
    expect(processInboundEvent).toHaveBeenCalledTimes(1)
  })

  it('rejects a request with a missing/wrong signature and never touches processInboundEvent', async () => {
    const { getWhatsAppSettings, processInboundEvent } = await import(
      '@/features/conversations/server/webhook'
    )
    vi.mocked(getWhatsAppSettings).mockResolvedValue({
      id: 's1',
      phoneNumberId: 'PNID',
      accessToken: 'T',
      verifyToken: 'V',
      appSecret: APP_SECRET,
    })
    const { handleWebhookPost } = await import('./whatsapp-webhook')

    const forgedBody = JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  { from: '1', id: 'wamid.FORGED', timestamp: '1', type: 'text', text: { body: 'forged' } },
                ],
              },
            },
          ],
        },
      ],
    })
    const request = new Request('http://localhost/api/whatsapp-webhook', {
      method: 'POST',
      body: forgedBody,
      headers: { 'x-hub-signature-256': 'sha256=' + '0'.repeat(64) },
    })

    const res = await handleWebhookPost(request)
    expect(res.status).toBe(403)
    expect(processInboundEvent).not.toHaveBeenCalled()
  })

  it('rejects a request with no signature header at all', async () => {
    const { getWhatsAppSettings, processInboundEvent } = await import(
      '@/features/conversations/server/webhook'
    )
    vi.mocked(getWhatsAppSettings).mockResolvedValue({
      id: 's1',
      phoneNumberId: 'PNID',
      accessToken: 'T',
      verifyToken: 'V',
      appSecret: APP_SECRET,
    })
    const { handleWebhookPost } = await import('./whatsapp-webhook')

    const request = new Request('http://localhost/api/whatsapp-webhook', {
      method: 'POST',
      body: '{}',
    })

    const res = await handleWebhookPost(request)
    expect(res.status).toBe(403)
    expect(processInboundEvent).not.toHaveBeenCalled()
  })
})
