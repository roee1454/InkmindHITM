/**
 * Server-only inbound webhook processing. Runs under the Pocketbase superuser client
 * because the caller (Meta) is unauthenticated and the `conversations`/`messages`
 * create rules are server-only by design.
 */
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { normalizePhoneNumber } from '@/integrations/whatsapp-cloud-api/webhook'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { abortActiveTurn } from '@/integrations/ai/agent.server'
import { botTurnScheduler } from '@/lib/debounce-scheduler'
import { enqueueConversationTurn } from '@/lib/queue/conversation-turn-queue'
import { phoneLock } from '@/lib/async-lock'
import { sanitizeClientName } from '@/lib/sanitization'
import type {
  InboundMedia,
  WhatsAppInboundEvent,
  ParsedInboundMessage,
} from '@/integrations/whatsapp-cloud-api/types'
import { detectCustomerSource } from '@/features/analytics/utils/attribution'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments.server'
import { routeInboundMessage } from './inbound-routing.server'
import { addWhatsAppMessageNotification } from '@/features/notifications/server/notifications'
import { hasStaffActionButtons } from '../utils/labels'

export { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'

const WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * 10-second wait period between each incoming message so rapid bursts coalesce and the agent
 * won't try to send messages before seeing the actual full conversation history.
 */
export const INBOUND_MESSAGE_DEBOUNCE_MS = 10_000

/** Rank used to ignore out-of-order status webhooks (a `read` may arrive before its
 *  `delivered`). `failed` outranks everything so a failure is never overwritten. */
const STATUS_RANK: Record<string, number> = {
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 99,
}

export async function processInboundEvent(event: WhatsAppInboundEvent): Promise<void> {
  const su = await getSuperuserClient()
  if (event.kind === 'status') {
    await applyStatusUpdate(su, event)
    return
  }
  await ingestInboundMessage(su, event)
}

async function ingestInboundMessage(
  su: PocketBase,
  event: Extract<WhatsAppInboundEvent, { kind: 'message' }>,
): Promise<void> {
  // Bug 31: Meta reactions (👍/❤️ or emoji removal where body is empty) should never trigger a bot turn
  if (event.message.type === 'reaction') {
    return
  }

  const phone = normalizePhoneNumber(event.from)
  const nowIso = new Date().toISOString()
  const windowExpiresIso = new Date(Date.now() + WINDOW_MS).toISOString()

  const [aiEnabled, waSettings] = await Promise.all([
    isAiEnabled(su),
    getWhatsAppSettings(),
  ])

  // Bug 33: Serialize customer & conversation lookup/creation per phone to prevent duplicates
  const { customer, conversation } = await phoneLock.runExclusive(phone, async () => {
    const cust = await findOrCreateCustomer(su, phone, event.senderName, event.message)
    const conv = await findOrCreateConversation(su, cust.id, nowIso, windowExpiresIso, aiEnabled)

    // A customer writing again after their booking: decided from facts and applied through the
    // state machine (inbound-routing.server.ts), never by a direct state write.
    const activeAppointment = await getActiveAppointmentForBot(su, cust.id).catch(() => null)
    await routeInboundMessage(su, conv, { hasUpcomingAppointment: Boolean(activeAppointment), aiEnabled, nowIso })

    return { customer: cust, conversation: conv }
  })

  // No typing indicator here anymore, and no synchronous transcription — both moved to the
  // point where the 10s debounce actually fires (see `runTurn` below): sending "typing" on
  // every inbound message was misleading (the bot isn't about to reply for another 10s+), and
  // transcribing inline blocked Meta's webhook response. transcribePendingAudio() in
  // src/lib/queue/conversation-turn-worker.ts now does the transcription that used to happen
  // right here, using the media already downloaded and persisted below.

  // Media is fetched once at ingest and cached on the row (the Cloud API download URL is
  // short-lived, so re-fetching per view is wasteful and breaks for old conversations).
  let mediaFile: File | null = null
  let errorDetail = ''
  if (event.message.media) {
    try {
      mediaFile = await downloadMediaFile(event.message.media)
    } catch (err) {
      errorDetail = `Media download failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Media classification (FLOW-13): funnel state is the primary signal, but content
  // Media classification: funnel state is the primary signal.
  // When in AWAIT_PAYMENT (or if document/explicit receipt caption), it is a verification receipt.
  // In intake stages (NEW, WANTS_TO_BOOK, COLLECTING_INFO, WAITLIST, AWAIT_PRICE_OFFER, AWAIT_HEALTH_NOTICE),
  // it is an inspiration reference image. Staff can always flip via setMessageMediaCategory.
  const mediaCategory = determineMediaCategory(
    event.message.type,
    conversation.state,
    event.message.body,
  )

  const timestampIso = unixSecondsToIso(event.timestamp)
  const payload: Record<string, unknown> = {
    conversation: conversation.id,
    whatsapp_message_id: event.wamid,
    direction: 'inbound',
    sender_type: 'customer',
    type: event.message.type,
    body: event.message.body,
    status: 'delivered',
    timestamp: timestampIso,
    reply_to_wamid: event.message.replyToWamid ?? '',
    error_detail: errorDetail,
    seen: false,
    media_category: mediaCategory,
  }
  if (mediaFile) payload.media = mediaFile

  let createdMessage: RecordModel | undefined
  try {
    createdMessage = await su.collection('messages').create(payload)
  } catch (err) {
    // The unique index on whatsapp_message_id is our dedup guard: if Meta redelivered the
    // same event, the insert fails and we treat it as an already-processed no-op.
    if (await messageExists(su, event.wamid)) return
    throw err
  }

  // Programmatic media classification and attachment to appointment (FLOW-14)
  if (createdMessage?.media) {
    const pbUrl = (process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || 'http://127.0.0.1:8090').replace(/\/$/, '')
    const fileUrl = `${pbUrl}/api/files/messages/${createdMessage.id}/${encodeURIComponent(createdMessage.media as string)}`

    const appointment = await getActiveAppointmentForBot(su, customer.id).catch(() => null)
    if (appointment) {
      await su.collection('messages').update(createdMessage.id, {
        appointment: appointment.id,
      }).catch(() => null)

      if (mediaCategory === 'verification') {
        await su.collection('appointments').update(appointment.id, {
          payment_receipt_url: fileUrl,
        }).catch((err) => console.warn('[webhook] failed to link receipt to appointment:', err))
      } else if (conversation.state === 'AWAIT_HEALTH_NOTICE') {
        await su.collection('appointments').update(appointment.id, {
          health_declaration_file_url: fileUrl,
        }).catch((err) => console.warn('[webhook] failed to link health declaration to appointment:', err))
        await su.collection('customers').update(customer.id, {
          health_declaration_url: fileUrl,
          health_declaration_signed: true,
          health_declaration_date: new Date().toISOString(),
        }).catch((err) => console.warn('[webhook] failed to link health declaration to customer:', err))
      } else {
        const currentRefImages = Array.isArray(appointment.reference_images)
          ? (appointment.reference_images as string[])
          : []
        if (!currentRefImages.includes(fileUrl)) {
          await su.collection('appointments').update(appointment.id, {
            reference_images: [...currentRefImages, fileUrl],
          }).catch((err) => console.warn('[webhook] failed to link inspiration image to appointment:', err))
        }
      }
    }
  }

  await su.collection('conversations').update(conversation.id, {
    last_message_at: timestampIso,
    whatsapp_window_expires_at: windowExpiresIso,
  })

  // Pure deterministic customer name extraction if customer has no verified name yet (Zero AI Guesswork)
  if ((!customer.name || (customer.name as string).trim() === '') && (event.message.type === 'text' || event.message.type === 'audio') && event.message.body) {
    const match = event.message.body.match(/(?:(?:קוראים לי|שמי|נעים להכיר,?\s*אני)\s+)([א-תA-Za-z]{2,20}(?:\s+[א-תA-Za-z]{2,20})?)/)
    if (match?.[1]) {
      const candidateName = sanitizeClientName(match[1])
      if (candidateName) {
        // Protect against accidental matching of studio staff/artist names
        const staffList = await su.collection('staff').getFullList().catch(() => [])
        const isStaffName = staffList.some((s: any) => {
          const sName = (s.name || '').toLowerCase()
          const cName = candidateName.toLowerCase()
          return sName && (sName.includes(cName) || cName.includes(sName))
        })
        if (!isStaffName) {
          await su.collection('customers').update(customer.id, { name: candidateName }).catch(() => null)
          customer.name = candidateName
        }
      }
    }
  }

  // Persistent system notification for staff
  const senderDisplayName = (customer.name as string) || normalizePhoneNumber(event.from)
  const bodyPreview =
    event.message.body ||
    (event.message.type === 'image'
      ? '📷 תמונה'
      : event.message.type === 'audio'
        ? '🎵 הודעה קולית'
        : event.message.type === 'document'
          ? '📄 מסמך'
          : 'קובץ מדיה')

  await addWhatsAppMessageNotification({ sender: senderDisplayName, preview: bodyPreview, conversationId: conversation.id }).catch((err) =>
    console.warn('[webhook] notification creation failed:', err),
  )

  // Check if conversation requires staff intervention (has action buttons in UI)
  const hasStaffActions = hasStaffActionButtons({
    state: conversation.state as string,
    status: conversation.status as string,
    staffCallReason: (conversation.staff_call_reason || null) as string | null,
  })

  if (hasStaffActions && conversation.status === 'bot_active') {
    await su.collection('conversations').update(conversation.id, { status: 'staff_handling' }).catch(() => null)
    conversation.status = 'staff_handling'
  }

  // Kept outside the dedup try/catch above so a duplicate webhook delivery (caught by the
  // unique-index guard) never re-triggers a bot turn for a message already handled.
  // We only run a bot turn if the conversation status is 'bot_active' to prevent the bot
  // from replying after a staff handoff (escalated/staff_handling/closed).
  if (conversation.status === 'bot_active' && !hasStaffActions) {
    // Abort any currently running turn for this conversation so it doesn't process stale context
    abortActiveTurn(conversation.id)

    // Fires once the 10s debounce below elapses with no further inbound message: this is the
    // one moment the customer actually sees "typing" (honest — the bot is genuinely about to
    // respond now), and where the real work moves onto the BullMQ queue instead of running
    // inline in this process.
    const runTurn = async () => {
      try {
        if (waSettings?.phoneNumberId && waSettings.accessToken) {
          await createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
            .sendTypingIndicator(event.wamid)
            .catch((err) => console.warn('[webhook] typing indicator failed:', err))
        }
        await su.collection('conversations').update(conversation.id, { bot_turn_phase: 'typing' }).catch(() => null)
        await enqueueConversationTurn({ conversationId: conversation.id, customerId: customer.id })
      } catch (err) {
        console.error('[webhook] failed to enqueue conversation turn:', err)
      }
    }

    // Wait 10 seconds between each inbound message: every new message resets the 10s timer,
    // ensuring the customer has finished typing/sending media and the agent won't try
    // to send messages before seeing the actual full conversation history. While waiting,
    // the CRM shows "ממתין להודעות נוספות" via bot_turn_phase='cooldown' (ConversationMessages.tsx).
    botTurnScheduler.schedule(conversation.id, INBOUND_MESSAGE_DEBOUNCE_MS, runTurn)
    await su.collection('conversations').update(conversation.id, { bot_turn_phase: 'cooldown' }).catch(() => null)
  }
}

async function applyStatusUpdate(
  su: PocketBase,
  event: Extract<WhatsAppInboundEvent, { kind: 'status' }>,
): Promise<void> {
  const rank = STATUS_RANK[event.status]
  if (!rank) return // deleted / warning — nothing to persist against our status enum

  let record
  try {
    // su.filter() parametrizes the value (FLOW-12) — wamid arrives from the webhook
    // payload, and raw interpolation would let a crafted value break out of the filter.
    record = await su
      .collection('messages')
      .getFirstListItem(su.filter('whatsapp_message_id = {:wamid}', { wamid: event.wamid }))
  } catch {
    return // status for a message we never stored (e.g. sent before this system existed)
  }

  const currentRank = STATUS_RANK[record.status as string] ?? 0
  if (rank < currentRank) return // out-of-order; keep the more-advanced status

  const update: Record<string, unknown> = { status: event.status }
  if (event.status === 'failed' && event.errors.length) {
    const e = event.errors[0]
    update.error_detail = [e?.code, e?.title, e?.message ?? e?.error_data?.details]
      .filter(Boolean)
      .join(' — ')
  }
  await su.collection('messages').update(record.id, update)
}

// --- helpers ---

async function findOrCreateCustomer(
  su: PocketBase,
  phone: string,
  name: string | null,
  parsedMsg?: ParsedInboundMessage,
) {
  const cleanName = sanitizeClientName(name)
  const attribution = parsedMsg
    ? detectCustomerSource({
        referral: parsedMsg.referral,
        text: { body: parsedMsg.body },
      })
    : { source: 'unknown' as const }
  try {
    // Parametrized (FLOW-12): phone comes from the webhook payload, not from us.
    const existing = await su.collection('customers').getFirstListItem(su.filter('phone = {:phone}', { phone }))
    const updateBody: Record<string, unknown> = {}

    // If existing customer has no name or generic name, sync verified name from WhatsApp profile
    if (cleanName && (!existing.name || (existing.name as string).trim() === '')) {
      updateBody.name = cleanName
      existing.name = cleanName
    }

    // Enrich source if previously unassigned or generic
    if (
      attribution.source !== 'unknown' &&
      (!existing.source || existing.source === 'unknown' || existing.source === 'whatsapp')
    ) {
      updateBody.source = attribution.source
      existing.source = attribution.source
    }

    if (Object.keys(updateBody).length > 0) {
      await su.collection('customers').update(existing.id, updateBody).catch(() => null)
    }

    return existing
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status !== 404) {
      throw err
    }
    try {
      return await su.collection('customers').create({
        name: cleanName ?? '',
        phone,
        whatsapp_chat_id: phone,
        source: attribution.source,
      })
    } catch (createErr: unknown) {
      // In case of unique violation or concurrent write from another process, fallback to fetch
      try {
        return await su.collection('customers').getFirstListItem(su.filter('phone = {:phone}', { phone }))
      } catch {
        throw createErr
      }
    }
  }
}

async function isAiEnabled(su: PocketBase): Promise<boolean> {
  const list = await su.collection('settings').getList(1, 1)
  return Boolean(list.items[0]?.ai_enabled)
}

async function findOrCreateConversation(
  su: PocketBase,
  customerId: string,
  nowIso: string,
  windowExpiresIso: string,
  aiEnabled: boolean,
) {
  try {
    return await su.collection('conversations').getFirstListItem(`customer = "${customerId}"`)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status !== 404) {
      throw err
    }
    try {
      return await su.collection('conversations').create({
        customer: customerId,
        status: aiEnabled ? 'bot_active' : 'staff_handling',
        state: 'NEW',
        last_message_at: nowIso,
        whatsapp_window_expires_at: windowExpiresIso,
      })
    } catch (createErr: unknown) {
      // In case of concurrent write from another process, fallback to fetch
      try {
        return await su.collection('conversations').getFirstListItem(`customer = "${customerId}"`)
      } catch {
        throw createErr
      }
    }
  }
}

async function downloadMediaFile(media: InboundMedia): Promise<File> {
  const settings = await getWhatsAppSettings()
  if (!settings?.phoneNumberId || !settings.accessToken) {
    throw new Error('WhatsApp credentials not configured')
  }
  const client = createWhatsAppClient({
    phoneNumberId: settings.phoneNumberId,
    accessToken: settings.accessToken,
  })
  const { url, mimeType } = await client.getMediaUrl(media.mediaId)
  const blob = await client.downloadMedia(url)
  const effectiveMime = media.mimeType ?? mimeType ?? 'application/octet-stream'
  const filename = media.filename ?? `${media.mediaId}${extensionFor(effectiveMime)}`
  return new File([blob], filename, { type: effectiveMime })
}

async function messageExists(su: PocketBase, wamid: string): Promise<boolean> {
  try {
    await su.collection('messages').getFirstListItem(su.filter('whatsapp_message_id = {:wamid}', { wamid }))
    return true
  } catch {
    return false
  }
}

function unixSecondsToIso(timestamp: string): string {
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds)) return new Date().toISOString()
  return new Date(seconds * 1000).toISOString()
}

function extensionFor(mime: string): string {
  const base = mime.split(';')[0]?.trim() ?? ''
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'application/pdf': '.pdf',
  }
  return map[base] ?? ''
}

export function determineMediaCategory(
  type: string,
  state?: string,
  caption?: string,
): 'inspiration' | 'verification' | null {
  if (type === 'text') return null
  const s = state || 'NEW'
  const c = caption || ''
  const looksLikeReceipt =
    type === 'document' ||
    /קבלה|אסמכתא|אסמכתה|שילמתי|העברתי|תשלום|ביט|bit|paybox|פייבוקס/i.test(c)
  if (looksLikeReceipt || s === 'AWAIT_PAYMENT') {
    return 'verification'
  }
  return 'inspiration'
}
