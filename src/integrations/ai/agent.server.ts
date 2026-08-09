/**
 * Orchestration core for the WhatsApp AI agent: one call = one bot turn. `.server.ts` suffix
 * for the same reason as `client.server.ts` — the Anthropic provider (and thus
 * `ANTHROPIC_API_KEY`) must never be reachable from a client bundle.
 */
import { generateText, stepCountIs, APICallError } from 'ai'
import type { ModelMessage } from 'ai'
import type PocketBase from 'pocketbase'
import { ClientResponseError } from 'pocketbase'
import { WhatsAppApiError } from '@/integrations/whatsapp-cloud-api/client'
import { buildGenerationParams } from './capabilities'
import { buildBotTools } from './tools.server'
import type { BotToolsContext } from './tools.server'
import { buildStaticSystemPrompt, buildDynamicSystemPrompt, getAllowedToolNames, STAFF_MESSAGE_TAG } from './prompts'
import type { ConversationState } from './prompts'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import type { WhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { getActiveAppointmentForBot } from '@/features/calendar/server/bot-appointments'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import { conversationLock } from '@/lib/async-lock'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { getModelInstance } from './providers.server'

const HISTORY_MESSAGE_LIMIT = 16
const MAX_TOOL_STEPS = 5

/** Per-state model routing (PERF-7): waiting/feedback states are short canned-guidance
 *  turns ("הצוות בודק, נחזור אליך") — the fast model handles them at a fraction of the
 *  latency and cost. States that negotiate, book, or finalize stay on the configured
 *  model. Deliberate deviation from the remediation plan, which also routed NEW to the
 *  light model: the first message sets the persona for the whole conversation, so NEW
 *  stays on the configured model. */
const LIGHT_MODEL = 'claude-haiku-4-5-20251001'
const LIGHT_STATES = new Set<ConversationState>([
  'AWAIT_PRICE_OFFER',
  'AWAIT_PAYMENT',
  'AWAIT_NPS_SCORE',
  'COMPLETED',
])
const VALID_STATES = new Set<ConversationState>([
  'NEW', 'COLLECTING_INFO', 'AWAIT_PRICE_OFFER', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION',
  'AWAITING_APPOINTMENT', 'AWAIT_NPS_SCORE', 'COMPLETED',
])
/** Conversation statuses the bot still turns for. `escalated` keeps running in a heavily
 *  restricted tool set (see `getAllowedToolNames`) rather than going fully silent, so a client
 *  isn't left ignored during a handoff the bot can still partially help with (e.g. answering a
 *  plain FAQ while staff picks up a receipt-verification call). `staff_handling` and `closed`
 *  never run the bot — those mean a human has manually taken the conversation over. */
const BOT_TURN_STATUSES = new Set(['bot_active'])



interface AiSettingsRecord {
  aiEnabled: boolean
  model: string
  temperature: number
  maxTokens: number | null
  systemInstructions: string
}

async function loadAiSettings(su: PocketBase): Promise<AiSettingsRecord> {
  const list = await su.collection('settings').getList(1, 1)
  const record = list.items[0]
  return {
    aiEnabled: Boolean(record?.ai_enabled),
    model: (record?.ai_model as string) || 'claude-sonnet-5',
    temperature: (record?.ai_temperature as number | undefined) ?? 0.4,
    maxTokens: (record?.ai_max_tokens as number | undefined) ?? null,
    systemInstructions: (record?.ai_system_instructions as string) || '',
  }
}

function toConversationState(raw: unknown): ConversationState {
  return VALID_STATES.has(raw as ConversationState) ? (raw as ConversationState) : 'NEW'
}

const MEDIA_TYPE_LABELS: Partial<Record<string, string>> = {
  image: 'תמונה',
  video: 'סרטון',
  audio: 'הודעה קולית',
  document: 'מסמך',
  sticker: 'סטיקר',
  location: 'מיקום',
  interactive: 'הודעה אינטראקטיבית',
  contacts: 'איש קשר',
  template: 'תבנית',
}

/** A non-text message's `body` is only its (often empty) caption — without this, the model has
 *  no signal at all that a message contains media, which matters most for a receipt screenshot
 *  during AWAIT_PAYMENT (the prompt tells it to call `call_staff` on "a photo of a receipt", but
 *  it can't recognize one it never sees). */
function describeInboundBody(r: Record<string, unknown>): string {
  const body = (r.body as string) || ''
  const type = r.type as string
  if (!type || type === 'text') return body || '[הודעה ללא טקסט]'
  const label = MEDIA_TYPE_LABELS[type] ?? 'קובץ מצורף'
  return body ? `[הלקוח שלח ${label}] ${body}` : `[הלקוח שלח ${label}]`
}

/** Bounded-recency history, mapped to AI SDK roles. Staff-authored outbound messages are
 *  narrated with `STAFF_MESSAGE_TAG` and placed in `assistant`-role (same role as the bot's own
 *  past replies), never `user`-role. This is deliberate and load-bearing: `direction:'inbound'`
 *  rows (raw, unfiltered customer text) always map to `user`-role, so the *role* field itself —
 *  not just the tag text — is what a customer can never forge. If a tagged staff override were
 *  instead placed in `user`-role, a customer could simply type the tag string into their own
 *  message and produce something textually identical to a real one; keeping it in
 *  `assistant`-role means only a genuinely staff-authored DB row (gated by `requireSession()`
 *  in `sendMessage`, never customer-writable) can ever produce that combination. */
function mapRecordToMessage(r: Record<string, unknown>): ModelMessage | null {
  const body = (r.body as string) || ''
  if (r.direction === 'inbound') {
    return { role: 'user', content: [{ type: 'text', text: describeInboundBody(r) }] }
  }
  if (r.sender_type === 'ai_bot') {
    return { role: 'assistant', content: [{ type: 'text', text: body }] }
  }
  if (r.sender_type === 'staff' && body) {
    return { role: 'assistant', content: [{ type: 'text', text: `${STAFF_MESSAGE_TAG} ${body}` }] }
  }
  return null
}

/** Chronological history mapped to AI SDK roles. The caller's query already bounds the
 *  window to the newest `HISTORY_MESSAGE_LIMIT` rows, so no slicing happens here.
 *  (A previous version split records around a "last processed id" — that id was always
 *  the newest inbound message, making the split branch dead code, so it was removed.) */
function buildHistory(records: Array<Record<string, unknown>>): ModelMessage[] {
  return records
    .map(mapRecordToMessage)
    .filter((m): m is ModelMessage => m !== null)
}

/** Cache breakpoints on the two newest odd-offset history messages, so next turn's
 *  longest shared prefix is re-read from cache instead of re-priced. Breakpoint budget:
 *  Anthropic allows 4 per request — 1 is spent on the static system prompt (see the
 *  `generateText` call below), these use 2 more, leaving 1 spare. */
function applyAnthropicCaching(history: ModelMessage[]) {
  const indices = [history.length - 1, history.length - 3]
  for (const idx of indices) {
    if (idx >= 0 && history[idx]) {
      history[idx].providerOptions = {
        anthropic: { cacheControl: { type: 'ephemeral' as const } },
      }
    }
  }
}

async function escalate(su: PocketBase, conversationId: string, reason: string, title: string, details: string) {
  try {
    const conversation = await su.collection('conversations').getOne(conversationId)
    if (conversation.status === 'escalated') {
      return // Already escalated, skip notification to avoid duplicates
    }
  } catch (err) {
    // If we fail to fetch, proceed anyway to be safe
  }

  await su.collection('conversations').update(conversationId, {
    status: 'escalated',
    is_staff_called: true,
    staff_call_reason: reason,
  }).catch(() => null)
  await addSystemNotification({
    title,
    message: details,
    type: 'error',
    link: `/dashboard/conversations?chatId=${conversationId}`,
  }).catch(() => null)
}

export interface RunBotTurnInput {
  su: PocketBase
  conversationId: string
  customerId: string
}

export async function runBotTurn(input: RunBotTurnInput): Promise<void> {
  return conversationLock.runExclusive(input.conversationId, () => runBotTurnInner(input))
}

async function runBotTurnInner({ su, conversationId, customerId }: RunBotTurnInput): Promise<void> {
  const t0 = Date.now()
  try {
    // Load all independent configuration and database records concurrently to reduce latency
    const [
      settings,
      waSettings,
      conversation,
      customer,
      messageRecords,
      activeAppointment
    ] = await Promise.all([
      loadAiSettings(su),
      getWhatsAppSettings(),
      su.collection('conversations').getOne(conversationId),
      su.collection('customers').getOne(customerId),
      // Newest window only — getFullList pulled the entire conversation on every turn
      // just to throw away all but the last HISTORY_MESSAGE_LIMIT rows (PERF-5).
      su.collection('messages')
        .getList(1, HISTORY_MESSAGE_LIMIT, {
          filter: `conversation = "${conversationId}"`,
          sort: '-timestamp',
        })
        .then((r) => r.items.reverse()),
      getActiveAppointmentForBot(su, customerId),
    ])

    const tLoaded = Date.now()

    if (!settings.aiEnabled) return
    if (!BOT_TURN_STATUSES.has(conversation.status as string)) return

    // Dedup guard against double-processing on rapid consecutive webhook hits (FLOW-9).
    // Persisted on the conversation row — the previous in-memory Map forgot everything
    // on restart and evicted FIFO rather than LRU. Read-then-write here is safe against
    // concurrent turns because conversationLock serializes turns per conversation.
    const inboundMessages = messageRecords.filter((m) => m.direction === 'inbound')
    const latestInboundId = inboundMessages[inboundMessages.length - 1]?.id as string | undefined

    if (latestInboundId) {
      if ((conversation.last_processed_message_id as string) === latestInboundId) {
        console.log(`[Agent] Inbound message ${latestInboundId} already processed. Skipping redundant turn.`)
        return
      }
      await su.collection('conversations').update(conversationId, {
        last_processed_message_id: latestInboundId,
      })
    }

    const isEscalated = conversation.status === 'escalated'
    const staffCallReason = (conversation.staff_call_reason as string) || null
    const state = toConversationState(conversation.state)

    let waClient: WhatsAppClient | undefined
    if (waSettings?.phoneNumberId && waSettings.accessToken) {
      waClient = createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
    }

    const bookingDate = activeAppointment ? toYmd(new Date(activeAppointment.start_time as string)) : null
    const bookingTime = activeAppointment
      ? minutesToTime(new Date(activeAppointment.start_time as string).getHours() * 60 + new Date(activeAppointment.start_time as string).getMinutes())
      : null

    const staticPrompt = buildStaticSystemPrompt({
      state,
      isEscalated,
      staffCallReason,
      customInstructions: settings.systemInstructions,
    })

    const dynamicPrompt = buildDynamicSystemPrompt({
      bookingDate,
      bookingTime,
      tattooInfo: conversation.tattoo_info,
    })

    const history = buildHistory(messageRecords)
    applyAnthropicCaching(history)
    const routedModel = LIGHT_STATES.has(state) ? LIGHT_MODEL : settings.model
    const modelInstance = getModelInstance(routedModel)

    const toolsCtx: BotToolsContext = {
      su,
      conversationId,
      customerId,
      conversationState: state,
      conversationStatus: conversation.status as string,
      staffCallReason,
      waClient,
      customerPhone: (customer.phone as string) || undefined,
    }
    const allTools = buildBotTools(toolsCtx)
    const allowedNames = new Set(getAllowedToolNames(state, isEscalated, staffCallReason))
    const tools = Object.fromEntries(
      Object.entries(allTools).filter(([name]) => allowedNames.has(name)),
    ) as Partial<typeof allTools>

    const result = await generateText({
      model: modelInstance,
      // Two system messages, deliberately split (PERF-1 + PERF-2): the static prompt
      // (rules/state/persona — identical across turns of the same state) carries the
      // cache breakpoint; the dynamic block (temporal context, booking snapshot,
      // tattoo_info) sits after it, so its churn never invalidates the cached prefix.
      // The provider reads cacheControl from the system message's own providerOptions —
      // a call-level providerOptions (the previous approach) silently did nothing.
      // This also stops the dynamic block from masquerading as the first user turn,
      // where every change broke the cache for the entire history behind it.
      system: [
        {
          role: 'system' as const,
          content: staticPrompt,
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } },
        },
        { role: 'system' as const, content: dynamicPrompt },
      ],
      messages: history,
      tools,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      // Re-gate the tool set every step (FLOW-8): the set used to be computed once per
      // turn, so a state-changing tool (collect_tattoo_info, call_staff, …) left the
      // remaining steps holding the previous state's broader tools. The tool layer
      // mirrors state/status changes into toolsCtx; this recomputes the gate from the
      // live values. Narrowing only — tools a new state would ADD wait for the next
      // turn, since the model was never given their definitions this turn. Deliberately
      // not `stopWhen: hasToolCall(...)`: hard-stopping on a state-changing tool would
      // swallow the follow-up message the model owes the customer after the tool result.
      prepareStep: () => {
        const escalatedNow = isEscalated || toolsCtx.conversationStatus === 'escalated'
        const allowedNow = getAllowedToolNames(
          toolsCtx.conversationState,
          escalatedNow,
          toolsCtx.staffCallReason ?? staffCallReason,
        )
        return { activeTools: allowedNow.filter((n) => n in tools) as Array<keyof typeof tools> }
      },
      ...buildGenerationParams(routedModel, {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
      }),
    })

    // Turn telemetry (PERF-8): the one log line that says where the time and tokens
    // went. `cacheRead*` > 0 is the living proof the PERF-1 cache fix still holds —
    // if it drops to 0 after a prompt refactor, the cache breakpoints broke.
    const tGenerated = Date.now()
    console.log(
      `[agent-timing] conv=${conversationId} state=${state} model=${routedModel}` +
        ` load=${tLoaded - t0}ms generate=${tGenerated - tLoaded}ms steps=${result.steps.length}` +
        ` in=${result.usage.inputTokens ?? '?'} out=${result.usage.outputTokens ?? '?'}` +
        ` anthropic=${JSON.stringify(result.providerMetadata?.anthropic ?? {})}`,
    )

    // Em/en-dash cleanup (LANG-7): the persona forbids long dashes, but models still leak
    // them. Space-aware replacement — a plain `[—–] → ','` turned " — " into " , " and
    // produced double punctuation next to existing commas.
    let replyText = result.text
      .trim()
      .replace(/\s*[—–]\s*/g, ', ')
      .replace(/,\s*,/g, ', ')

    // Absolute rule (LANG-8): once the send_message tool has fired, the customer already
    // got this turn's content as separate WhatsApp messages — any trailing text here is a
    // duplicate or filler by definition, so drop it unconditionally. The prompt orders the
    // model to end such turns with empty output; this enforces it. (The previous version
    // pattern-matched a hardcoded filler list, which is unwinnable in Hebrew.)
    if (toolsCtx.didSendMessage) {
      replyText = ''
    }

    if (!replyText) return // a turn that only called a tool (e.g. call_staff or send_message) may have no reply

    if (!waClient || !waSettings?.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured')
    }
    const { wamid } = await waClient.sendText({ to: customer.phone as string, body: replyText })

    const nowIso = new Date().toISOString()
    // Concurrently save outbound message record and update conversation timestamp
    await Promise.all([
      su.collection('messages').create({
        conversation: conversationId,
        whatsapp_message_id: wamid,
        direction: 'outbound',
        sender_type: 'ai_bot',
        type: 'text',
        body: replyText,
        status: 'sent',
        timestamp: nowIso,
        seen: true,
      }),
      su.collection('conversations').update(conversationId, { last_message_at: nowIso }),
    ])
    console.log(`[agent-timing] conv=${conversationId} deliver=${Date.now() - tGenerated}ms total=${Date.now() - t0}ms`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Classified escalation (FLOW-10): the previous catch collapsed everything into one
    // generic reason, leaving staff unable to tell a model outage from a WhatsApp send
    // failure from a DB error without digging through server logs.
    let reason = 'unhandled_query'
    let title = 'הבוט לא הצליח להשיב'
    if (err instanceof WhatsAppApiError) {
      reason = 'system_whatsapp_error'
      title = 'שליחת וואטסאפ נכשלה בתור הבוט'
    } else if (err instanceof ClientResponseError) {
      reason = 'system_database_error'
      title = 'שגיאת בסיס נתונים בתור הבוט'
    } else if (APICallError.isInstance(err)) {
      reason = 'system_model_error'
      title = 'קריאת מודל ה-AI נכשלה'
    }
    await escalate(su, conversationId, reason, title, `שגיאה בעיבוד הודעת הבוט: ${message}`)
  }
}
