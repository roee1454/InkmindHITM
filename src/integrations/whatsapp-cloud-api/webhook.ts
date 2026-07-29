/**
 * Pure webhook parsing/normalization — no I/O, so it's trivially unit-testable.
 *
 * Deliberately far simpler than WAHA's `chat-id.ts`: Cloud API never echoes your own
 * outbound sends back as inbound `messages[]` (delivery acks come separately in
 * `statuses[]`), and it always gives a real E.164 `wa_id` — so there is no `@lid`
 * resolution, no bot-signature detection, and no self-chat disambiguation to do here.
 */
import type {
  MessageType,
  ParsedInboundMessage,
  RawMessage,
  WebhookPayload,
  WhatsAppInboundEvent,
} from './types'

/** Cloud API `wa_id`s have no leading '+'; store everything as E.164 with '+' so inbound
 *  `from` and outbound `to` compare equal against `customers.phone`. */
export function normalizePhoneNumber(waId: string): string {
  const trimmed = waId.trim()
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`
}

/** Walks the (possibly batched) webhook envelope and yields one normalized event per
 *  `messages[]` / `statuses[]` entry across every entry/change. */
export function parseWebhookPayload(body: unknown): WhatsAppInboundEvent[] {
  const payload = body as WebhookPayload
  const events: WhatsAppInboundEvent[] = []

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value
      if (!value) continue

      const senderName = value.contacts?.[0]?.profile?.name ?? null

      for (const message of value.messages ?? []) {
        if (!message.id || !message.from) continue
        events.push({
          kind: 'message',
          wamid: message.id,
          from: message.from,
          timestamp: message.timestamp ?? String(Math.floor(Date.now() / 1000)),
          senderName,
          message: parseInboundMessage(message),
        })
      }

      for (const status of value.statuses ?? []) {
        if (!status.id || !status.status) continue
        events.push({
          kind: 'status',
          wamid: status.id,
          status: status.status,
          timestamp: status.timestamp ?? String(Math.floor(Date.now() / 1000)),
          recipientId: status.recipient_id ?? null,
          errors: status.errors ?? [],
        })
      }
    }
  }

  return events
}

function parseInboundMessage(m: RawMessage): ParsedInboundMessage {
  const replyToWamid = m.context?.id ?? null
  const base = { media: null, location: null, replyToWamid } as const

  switch (m.type) {
    case 'text':
      return { ...base, type: 'text', body: m.text?.body ?? '' }

    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker': {
      const raw = m[m.type]
      const filename = m.type === 'document' ? (m.document?.filename ?? null) : null
      return {
        ...base,
        type: m.type,
        body: raw?.caption ?? '',
        media: raw?.id
          ? { mediaId: raw.id, mimeType: raw.mime_type ?? null, filename }
          : null,
      }
    }

    case 'location': {
      const loc = m.location
      const label = [loc?.name, loc?.address].filter(Boolean).join(' — ')
      return {
        ...base,
        type: 'location',
        body: label || `${loc?.latitude ?? '?'}, ${loc?.longitude ?? '?'}`,
        location:
          typeof loc?.latitude === 'number' && typeof loc.longitude === 'number'
            ? {
                latitude: loc.latitude,
                longitude: loc.longitude,
                name: loc.name ?? null,
                address: loc.address ?? null,
              }
            : null,
      }
    }

    case 'contacts':
      return { ...base, type: 'contacts', body: describeContacts(m.contacts) }

    case 'interactive': {
      const i = m.interactive
      const title = i?.button_reply?.title ?? i?.list_reply?.title ?? ''
      return { ...base, type: 'interactive', body: title }
    }

    // Template quick-reply taps arrive as `button`, not `interactive`. Fold both into
    // our `interactive` enum value (they're both "customer tapped a control you sent").
    case 'button':
      return { ...base, type: 'interactive', body: m.button?.text ?? '' }

    // Reactions have no dedicated enum value; represent as a text row carrying the emoji
    // and linking back to the reacted-to message. (fallback)
    case 'reaction':
      return {
        ...base,
        type: 'text',
        body: m.reaction?.emoji ?? '',
        replyToWamid: m.reaction?.message_id ?? replyToWamid,
      }

    // Unknown / unsupported / system types: keep the row valid rather than dropping the
    // message, so staff at least see that *something* came in. (fallback)
    default:
      return { ...base, type: 'text', body: unsupportedLabel(m.type) }
  }
}

function describeContacts(contacts: unknown[] | undefined): string {
  if (!contacts?.length) return 'כרטיס איש קשר'
  const names = contacts
    .map((c) => {
      const name = (c as { name?: { formatted_name?: string } }).name
      return name?.formatted_name
    })
    .filter(Boolean)
  return names.length ? `כרטיס איש קשר: ${names.join(', ')}` : 'כרטיס איש קשר'
}

function unsupportedLabel(type: string | undefined): string {
  return `[הודעה מסוג ${type ?? 'לא ידוע'} שאינו נתמך]`
}

// Re-exported so callers get the enum without reaching into ./types directly.
export type { MessageType }
