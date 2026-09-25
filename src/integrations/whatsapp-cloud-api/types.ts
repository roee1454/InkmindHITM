/**
 * WhatsApp Cloud API — wire-format and normalized domain types.
 *
 * The raw `Webhook*` types mirror Meta's payload shapes (see
 * `.claude/skills/whatsapp-cloud-api/references/WEBHOOKS.md`). They are intentionally
 * loose (optional everywhere) because Meta batches unrelated event kinds into the same
 * envelope and omits keys that don't apply. `webhook.ts` is the single place that
 * translates these into the strict `WhatsAppInboundEvent` domain shape the rest of the
 * app consumes.
 */

// --- our persisted enums (must match the Pocketbase `messages` collection) ---

export type MessageType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'sticker'
  | 'location'
  | 'contacts'
  | 'interactive'
  | 'template'
  | 'reaction'

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed'

// --- raw webhook wire format ---

export interface WebhookPayload {
  object?: string
  entry?: WebhookEntry[]
}

interface WebhookEntry {
  id?: string
  changes?: WebhookChange[]
}

interface WebhookChange {
  field?: string
  value?: WebhookValue
}

interface WebhookValue {
  messaging_product?: string
  metadata?: { display_phone_number?: string; phone_number_id?: string }
  contacts?: RawContact[]
  messages?: RawMessage[]
  statuses?: RawStatus[]
}

interface RawContact {
  profile?: { name?: string }
  wa_id?: string
}

export interface RawMessage {
  from?: string
  id?: string
  timestamp?: string
  type?: string
  context?: { from?: string; id?: string }
  text?: { body?: string }
  image?: RawMedia
  video?: RawMedia
  audio?: RawMedia
  document?: RawMedia & { filename?: string }
  sticker?: RawMedia
  location?: { latitude?: number; longitude?: number; name?: string; address?: string }
  contacts?: unknown[]
  interactive?: {
    type?: string
    button_reply?: { id?: string; title?: string }
    list_reply?: { id?: string; title?: string; description?: string }
  }
  button?: { text?: string; payload?: string }
  reaction?: { message_id?: string; emoji?: string }
  referral?: RawReferral
}

export interface RawReferral {
  source_url?: string
  source_id?: string
  source_type?: 'ad' | 'post' | string
  headline?: string
  body?: string
  media_type?: string
  image_url?: string
  video_url?: string
  thumbnail_url?: string
  ctwa_clid?: string
}

interface RawMedia {
  id?: string
  mime_type?: string
  sha256?: string
  caption?: string
}

interface RawStatus {
  id?: string
  status?: string
  timestamp?: string
  recipient_id?: string
  errors?: RawError[]
}

export interface RawError {
  code?: number
  title?: string
  message?: string
  error_data?: { details?: string }
}

// --- normalized domain events (what `parseWebhookPayload` returns) ---

export interface InboundMedia {
  mediaId: string
  mimeType: string | null
  filename: string | null
}

export interface ParsedInboundMessage {
  type: MessageType
  /** Human-readable text: message body, media caption, or a description of the payload. */
  body: string
  media: InboundMedia | null
  location: { latitude: number; longitude: number; name: string | null; address: string | null } | null
  /** wamid of the message this one replies to (context.id), if any. */
  replyToWamid: string | null
  referral?: RawReferral
}

export type WhatsAppInboundEvent =
  | {
      kind: 'message'
      wamid: string
      /** Sender wa_id as delivered by Meta — E.164 digits, no leading '+'. */
      from: string
      /** Unix seconds as a string, exactly as Meta sends it. */
      timestamp: string
      senderName: string | null
      message: ParsedInboundMessage
    }
  | {
      kind: 'status'
      /** wamid of the original outbound message this status refers to. */
      wamid: string
      status: string
      timestamp: string
      recipientId: string | null
      errors: RawError[]
    }

export interface WhatsAppCredentials {
  phoneNumberId: string
  accessToken: string
  businessAccountId?: string
}

// --- Meta WhatsApp Business Management API types ---

export interface MetaTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string
  format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | string
  text?: string
  example?: {
    body_text?: string[][]
    header_text?: string[]
  }
  buttons?: Array<{
    type: string
    text: string
    url?: string
    phone_number?: string
  }>
}

export interface MetaMessageTemplate {
  id: string
  name: string
  status: string
  category: string
  language: string
  components: MetaTemplateComponent[]
}

export interface UIMetaTemplate {
  id: string
  name: string
  displayName: string
  description: string
  language: string
  category: string
  status: string
  bodyText: string
  params: Array<{
    index: number
    label: string
    placeholder: string
    example?: string
  }>
}
