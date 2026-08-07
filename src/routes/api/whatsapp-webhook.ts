import { createHmac, timingSafeEqual } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { parseWebhookPayload } from '@/integrations/whatsapp-cloud-api/webhook'
import { getWhatsAppSettings, processInboundEvent } from '@/features/conversations/server/webhook'
import { logWhatsAppError } from '@/features/settings/server/whatsapp-error-log'

/** Verifies Meta's X-Hub-Signature-256 header against the WhatsApp App Secret, per
 *  https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validating-payloads —
 *  without this, anyone who discovers the webhook URL can forge inbound WhatsApp messages. */
export function isValidSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false
  const [scheme, hex] = signatureHeader.split('=')
  if (scheme !== 'sha256' || !hex) return false

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const actualBuf = Buffer.from(hex, 'hex')
  if (expectedBuf.length !== actualBuf.length) return false
  return timingSafeEqual(expectedBuf, actualBuf)
}

// Verification handshake: Meta GETs this once with the verify token when you save the
// webhook URL in the App Dashboard. Echo hub.challenge iff the token matches.
export async function handleWebhookGet(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  const settings = await getWhatsAppSettings()
  if (mode === 'subscribe' && token && token === settings?.verifyToken) {
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
  return new Response('Forbidden', { status: 403 })
}

// Inbound messages and status updates. Meta expects a fast 200; we process synchronously
// (single-studio volume is low, and there's no background queue in this stack yet —
// deliberately not faking async without one), then acknowledge. Any processing error is
// swallowed after logging so Meta gets its 200 and does not disable the webhook or hammer
// us with retries. The signature check runs first and short-circuits everything else —
// without it, anyone who discovers this URL could forge inbound WhatsApp messages.
export async function handleWebhookPost(request: Request): Promise<Response> {
  const rawBody = await request.text()

  const settings = await getWhatsAppSettings()
  const signature = request.headers.get('x-hub-signature-256')
  if (!isValidSignature(rawBody, signature, settings?.appSecret ?? '')) {
    await logWhatsAppError('webhook_signature', 'Rejected inbound webhook: invalid or missing X-Hub-Signature-256.')
    return new Response('Forbidden', { status: 403 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const events = parseWebhookPayload(payload)
  for (const event of events) {
    try {
      await processInboundEvent(event)
    } catch (err) {
      console.error('[whatsapp-webhook] failed to process event', event.wamid, err)
      const message = err instanceof Error ? err.message : String(err)
      await logWhatsAppError('webhook_processing', `wamid ${event.wamid}: ${message}`)
    }
  }

  return new Response('OK', { status: 200 })
}

/**
 * Meta WhatsApp Cloud API webhook. This is the app's first `server.handlers` route —
 * per CLAUDE.md, a server route (not a `createServerFn`) is the right tool because the
 * caller is an external system hitting a stable URL with arbitrary GET/POST payloads.
 */
export const Route = createFileRoute('/api/whatsapp-webhook')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handleWebhookGet(request),
      POST: ({ request }: { request: Request }) => handleWebhookPost(request),
    },
  },
})
