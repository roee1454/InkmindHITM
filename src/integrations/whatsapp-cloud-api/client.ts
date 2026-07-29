/**
 * Thin Meta Graph API client for WhatsApp Cloud API. Constructed per-call from the
 * `settings` singleton's credentials (a factory, not a module singleton) so
 * "test connection" can validate candidate credentials before they're saved.
 */
import type { WhatsAppCredentials } from './types'

const GRAPH_BASE = 'https://graph.facebook.com/v21.0'

/** Typed wrapper around Graph's error envelope so callers can branch on `code`
 *  (e.g. 131047 = 24h window closed / re-engagement required). */
export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly title: string | null,
    readonly httpStatus: number,
  ) {
    super(message)
    this.name = 'WhatsAppApiError'
  }
}

/** Graph error code for "message sent outside the 24h customer-service window". */
export const ERROR_REENGAGEMENT_REQUIRED = 131047

interface GraphErrorEnvelope {
  error?: { message?: string; type?: string; code?: number; error_subcode?: number }
}

async function throwGraphError(res: Response): Promise<never> {
  let body: GraphErrorEnvelope = {}
  try {
    body = (await res.json()) as GraphErrorEnvelope
  } catch {
    // non-JSON error body; fall through with the status line
  }
  const err = body.error
  throw new WhatsAppApiError(
    err?.message ?? `WhatsApp API request failed (HTTP ${res.status})`,
    err?.code ?? null,
    err?.type ?? null,
    res.status,
  )
}

export interface SendTextParams {
  to: string
  body: string
  replyToWamid?: string
}

export interface SendMediaParams {
  to: string
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker'
  mediaId?: string
  link?: string
  caption?: string
  filename?: string
  replyToWamid?: string
}

export interface SendResult {
  wamid: string
}

export interface PhoneNumberInfo {
  displayPhoneNumber: string
  verifiedName: string
}

export function createWhatsAppClient(creds: WhatsAppCredentials) {
  const authHeader = { Authorization: `Bearer ${creds.accessToken}` }

  async function postMessage(payload: Record<string, unknown>): Promise<SendResult> {
    const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    })
    if (!res.ok) await throwGraphError(res)
    const data = (await res.json()) as { messages?: { id?: string }[] }
    return { wamid: data.messages?.[0]?.id ?? '' }
  }

  return {
    async sendText(params: SendTextParams): Promise<SendResult> {
      return postMessage({
        recipient_type: 'individual',
        to: params.to,
        type: 'text',
        text: { body: params.body, preview_url: false },
        ...(params.replyToWamid ? { context: { message_id: params.replyToWamid } } : {}),
      })
    },

    async sendMedia(params: SendMediaParams): Promise<SendResult> {
      const mediaObject: Record<string, unknown> = {}
      if (params.mediaId) mediaObject.id = params.mediaId
      else if (params.link) mediaObject.link = params.link
      if (params.caption && params.type !== 'sticker' && params.type !== 'audio') {
        mediaObject.caption = params.caption
      }
      if (params.filename && params.type === 'document') mediaObject.filename = params.filename

      return postMessage({
        recipient_type: 'individual',
        to: params.to,
        type: params.type,
        [params.type]: mediaObject,
        ...(params.replyToWamid ? { context: { message_id: params.replyToWamid } } : {}),
      })
    },

    async markRead(wamid: string): Promise<void> {
      const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: wamid }),
      })
      if (!res.ok) await throwGraphError(res)
    },

    /** Marks the inbound message read AND shows a typing indicator — Meta couples the two
     *  (`typing_indicator` requires `status: "read"` in the same call, per the Cloud API
     *  docs). The indicator auto-dismisses when a reply is sent or after 25 seconds,
     *  which covers this app's debounce-plus-model-turn window. Only call when a reply
     *  is actually coming — Meta flags indicator-without-reply as bad UX. */
    async sendTypingIndicator(wamid: string): Promise<void> {
      const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: wamid,
          typing_indicator: { type: 'text' },
        }),
      })
      if (!res.ok) await throwGraphError(res)
    },

    /** Uploads a file to WhatsApp, returning a Media ID reusable for 30 days. */
    async uploadMedia(file: Blob, mimeType: string): Promise<{ mediaId: string }> {
      const form = new FormData()
      form.append('messaging_product', 'whatsapp')
      form.append('type', mimeType)
      form.append('file', file, 'upload')
      const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/media`, {
        method: 'POST',
        headers: authHeader,
        body: form,
      })
      if (!res.ok) await throwGraphError(res)
      const data = (await res.json()) as { id?: string }
      return { mediaId: data.id ?? '' }
    },

    /** Resolves a Media ID to a short-lived authenticated download URL. */
    async getMediaUrl(mediaId: string): Promise<{ url: string; mimeType: string | null }> {
      const res = await fetch(`${GRAPH_BASE}/${mediaId}`, { headers: authHeader })
      if (!res.ok) await throwGraphError(res)
      const data = (await res.json()) as { url?: string; mime_type?: string }
      return { url: data.url ?? '', mimeType: data.mime_type ?? null }
    },

    /** Downloads media binary from a URL returned by `getMediaUrl` (auth required). */
    async downloadMedia(url: string): Promise<Blob> {
      const res = await fetch(url, { headers: authHeader })
      if (!res.ok) await throwGraphError(res)
      return res.blob()
    },

    /** Cheap read-only call used by "test connection" to validate credentials. */
    async getPhoneNumberInfo(): Promise<PhoneNumberInfo> {
      const res = await fetch(
        `${GRAPH_BASE}/${creds.phoneNumberId}?fields=display_phone_number,verified_name`,
        { headers: authHeader },
      )
      if (!res.ok) await throwGraphError(res)
      const data = (await res.json()) as { display_phone_number?: string; verified_name?: string }
      return {
        displayPhoneNumber: data.display_phone_number ?? '',
        verifiedName: data.verified_name ?? '',
      }
    },
  }
}

export type WhatsAppClient = ReturnType<typeof createWhatsAppClient>
