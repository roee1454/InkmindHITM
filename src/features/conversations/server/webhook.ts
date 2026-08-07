/**
 * Server-only inbound webhook processing. Runs under the Pocketbase superuser client
 * because the caller (Meta) is unauthenticated and the `conversations`/`messages`
 * create rules are server-only by design.
 */
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { normalizePhoneNumber } from '@/integrations/whatsapp-cloud-api/webhook'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { runBotTurn } from '@/integrations/ai/agent.server'
import { botTurnScheduler } from '@/lib/debounce-scheduler'
import type {
  InboundMedia,
  WhatsAppInboundEvent,
} from '@/integrations/whatsapp-cloud-api/types'
import type PocketBase from 'pocketbase'

export { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'

const WINDOW_MS = 24 * 60 * 60 * 1000

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
  const phone = normalizePhoneNumber(event.from)
  const nowIso = new Date().toISOString()
  const windowExpiresIso = new Date(Date.now() + WINDOW_MS).toISOString()

  const [aiEnabled, customer, waSettings] = await Promise.all([
    isAiEnabled(su),
    findOrCreateCustomer(su, phone, event.senderName),
    getWhatsAppSettings(),
  ])
  const conversation = await findOrCreateConversation(su, customer.id, nowIso, windowExpiresIso, aiEnabled)

  // Typing indicator (+ its mandatory read receipt — Meta couples the two) as early as
  // possible once we know the bot will answer: the debounce window plus the model turn
  // otherwise leave the customer staring at silence for many seconds (PERF-3). Meta
  // auto-dismisses the indicator when the reply lands or after 25s. Fire-and-forget —
  // a Graph hiccup must never block ingest.
  if (aiEnabled && conversation.status === 'bot_active' && waSettings?.phoneNumberId && waSettings.accessToken) {
    createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
      .sendTypingIndicator(event.wamid)
      .catch((err) => console.warn('[webhook] typing indicator failed:', err))
  }

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
  // overrides it — a PDF is a receipt in any state, and a caption that talks about
  // payment marks a verification even mid-collection. Staff can still flip the
  // category manually via setMessageMediaCategory.
  let mediaCategory: 'inspiration' | 'verification' | null = null
  if (event.message.type !== 'text') {
    const state = conversation.state || 'NEW'
    const caption = event.message.body || ''
    const looksLikeReceipt =
      event.message.type === 'document' ||
      /קבלה|אסמכתא|שילמתי|העברתי|תשלום|ביט|bit|paybox|פייבוקס/i.test(caption)
    if (looksLikeReceipt) {
      mediaCategory = 'verification'
    } else if (state === 'NEW' || state === 'COLLECTING_INFO' || state === 'AWAIT_PRICE_OFFER') {
      mediaCategory = 'inspiration'
    } else {
      mediaCategory = 'verification'
    }
  }

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

  try {
    await su.collection('messages').create(payload)
  } catch (err) {
    // The unique index on whatsapp_message_id is our dedup guard: if Meta redelivered the
    // same event, the insert fails and we treat it as an already-processed no-op.
    if (await messageExists(su, event.wamid)) return
    throw err
  }

  await su.collection('conversations').update(conversation.id, {
    last_message_at: timestampIso,
    whatsapp_window_expires_at: windowExpiresIso,
  })

  // Kept outside the dedup try/catch above so a duplicate webhook delivery (caught by the
  // unique-index guard) never re-triggers a bot turn for a message already handled.
  // We only run a bot turn if the conversation status is 'bot_active' to prevent the bot
  // from replying after a staff handoff (escalated/staff_handling/closed).
  if (conversation.status === 'bot_active') {
    const runTurn = () => runBotTurn({ su, conversationId: conversation.id, customerId: customer.id })
      .catch((err) => console.error('runBotTurn failed:', err))

    // Debounce values (PERF-4): long enough to coalesce a burst ("היי" + "רוצה קעקוע" +
    // "על היד") into one bot turn, short enough that with the typing indicator above the
    // perceived wait stays ~2s. Every extra second here is dead air before the model
    // even starts.
    if (event.message.type !== 'text') {
      botTurnScheduler.schedule(conversation.id, 3000, runTurn) // media often arrives in bursts (albums)
    } else {
      // Fetch the two most recent inbound messages to detect if this is a new wave of typing
      const lastMessages = await su.collection('messages').getList(1, 2, {
        filter: `conversation = "${conversation.id}" && direction = "inbound"`,
        sort: '-timestamp',
      }).then(r => r.items).catch(() => [])

      const latestInbound = lastMessages[0]
      const prevInbound = lastMessages[1]

      let delayMs = 1500 // default subsequent message delay

      if (!prevInbound || !latestInbound) {
        delayMs = 2500 // first message in the chat
      } else {
        const latestTime = new Date(latestInbound.timestamp as string).getTime()
        const prevTime = new Date(prevInbound.timestamp as string).getTime()
        const diffSeconds = (latestTime - prevTime) / 1000

        if (diffSeconds > 15) {
          delayMs = 2500 // first message of a new wave (typing session)
        }
      }

      botTurnScheduler.schedule(conversation.id, delayMs, runTurn)
    }
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

async function findOrCreateCustomer(su: PocketBase, phone: string, name: string | null) {
  try {
    // Parametrized (FLOW-12): phone comes from the webhook payload, not from us.
    return await su.collection('customers').getFirstListItem(su.filter('phone = {:phone}', { phone }))
  } catch {
    return su.collection('customers').create({
      name: name ?? '',
      phone,
      whatsapp_chat_id: phone,
      source: 'whatsapp',
      lead_stage: 'new',
    })
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
  } catch {
    return su.collection('conversations').create({
      customer: customerId,
      status: aiEnabled ? 'bot_active' : 'staff_handling',
      last_message_at: nowIso,
      whatsapp_window_expires_at: windowExpiresIso,
    })
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
