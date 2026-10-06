import { generateText, stepCountIs } from 'ai'
import type PocketBase from 'pocketbase'
import { buildGenerationParams } from '../model/generation-params'
import { buildBotTools } from '../tools.server'
import type { BotToolsContext } from '../tools.server'
import { buildStaticSystemPrompt, buildDynamicSystemPrompt, getAllowedToolNames } from '../prompts'
import { applyFactGuards, toConversationFacts } from '../tools/fact-guards'
import { SYSTEM_AI_MODEL, SYSTEM_AI_MAX_TOKENS } from '../model/defaults'
import { createWhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import type { WhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import { getWhatsAppSettings } from '@/integrations/whatsapp-cloud-api/settings.server'
import { getActiveAppointmentsForBot, getPastCustomerAppointmentsInfo } from '@/features/calendar/server/bot-appointments.server'
import { toConversationState } from '@/features/conversations/server/state-machine'
import { toLedgerAppointment } from '@/features/payments/server/project-finance.server'
import { loadProjectPromptContext } from './project-context.server'
import { isHealthDeclarationValid } from '@/features/health-declaration/server/health-service'
import { conversationLock } from '@/lib/async-lock'
import { toYmd, minutesToTime } from '@/lib/date-utils'
import { getModelInstance } from '../model/provider.server'
import { getStudioAgentRuntimeConfig, formatStudioPoliciesForPrompt } from '../studio-config.server'
import { activeTurnControllers } from './turn-cancellation.server'
import { buildHistory, ensureTrailingUserMessage, applyAnthropicCaching } from './history'
import { isVerifiedStaffInstruction, extractCleanStaffInstruction } from './staff-instruction'
import { cleanBotPunctuation } from './text-cleanup'
import { escalate, classifyBotTurnError } from './escalation.server'

const HISTORY_MESSAGE_LIMIT = 35
const MAX_TOOL_STEPS = 5

/** Conversation statuses the bot still turns for. `escalated` keeps running in a heavily
 *  restricted tool set (see `getAllowedToolNames`) rather than going fully silent, so a client
 *  isn't left ignored during a handoff the bot can still partially help with (e.g. answering a
 *  plain FAQ while staff picks up a receipt-verification call). `staff_handling` and `closed`
 *  never run the bot — those mean a human has manually taken the conversation over. */
const BOT_TURN_STATUSES = new Set(['bot_active'])

export interface RunBotTurnInput {
  su: PocketBase
  conversationId: string
  customerId: string
  force?: boolean
}

export async function runBotTurn(input: RunBotTurnInput): Promise<void> {
  return conversationLock.runExclusive(input.conversationId, () => runBotTurnInner(input))
}

/** Exported so the BullMQ conversation-turn worker (src/lib/queue/conversation-turn-worker.ts)
 *  can call it directly under its own conversationLock.runExclusive, instead of double-locking
 *  through the runBotTurn wrapper above. */
export async function runBotTurnInner({ su, conversationId, customerId, force }: RunBotTurnInput): Promise<void> {
  // Register a fresh AbortController so a new inbound message can cancel this turn mid-flight.
  const controller = new AbortController()
  activeTurnControllers.set(conversationId, controller)
  const t0 = Date.now()

  try {
    // Load all independent configuration and database records concurrently to reduce latency
    const [
      settings,
      waSettings,
      conversation,
      customer,
      messageRecords,
      activeAppointments,
      pastCustomerInfo,
    ] = await Promise.all([
      getStudioAgentRuntimeConfig(su),
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
      getActiveAppointmentsForBot(su, customerId),
      getPastCustomerAppointmentsInfo(su, customerId),
    ])

    const tLoaded = Date.now()

    if (!settings.aiEngine.enabled) return
    if (!BOT_TURN_STATUSES.has(conversation.status as string)) return

    // Context hygiene: if conversation has a booking_session_started_at, isolate history to this session
    let effectiveMessages = messageRecords
    if (conversation.booking_session_started_at) {
      const sessionStartMs = new Date(conversation.booking_session_started_at as string).getTime()
      const currentSessionMessages = messageRecords.filter((m) => {
        const t = m.timestamp ? new Date(m.timestamp as string).getTime() : 0
        return t >= sessionStartMs
      })
      if (currentSessionMessages.length > 0) {
        effectiveMessages = currentSessionMessages
      }
    }

    // Dedup guard against double-processing on rapid consecutive webhook hits (FLOW-9).
    const inboundMessages = effectiveMessages.filter((m) => m.direction === 'inbound')
    const latestInboundId = inboundMessages[inboundMessages.length - 1]?.id

    if (!force && latestInboundId) {
      if ((conversation.last_processed_message_id as string) === latestInboundId) {
        console.log(`[Agent] Inbound message ${latestInboundId} already processed. Skipping redundant turn.`)
        return
      }
    }

    const staffCallReason = (conversation.staff_call_reason as string) || null
    const state = toConversationState(conversation.state)

    let waClient: WhatsAppClient | undefined
    if (waSettings?.phoneNumberId && waSettings.accessToken) {
      waClient = createWhatsAppClient({ phoneNumberId: waSettings.phoneNumberId, accessToken: waSettings.accessToken })
    }

    const mappedActiveAppointments = activeAppointments.map((a) => {
      const staffRec = a.expand?.staff as { name?: string } | undefined
      const d = new Date(a.start_time as string)
      return {
        id: a.id,
        date: toYmd(d),
        timeSlot: minutesToTime(d.getHours() * 60 + d.getMinutes()),
        artistName: staffRec?.name,
        kind: toLedgerAppointment(a).kind,
        tattooDescription: (a.tattoo_description as string) || undefined,
        status: (a.status as string) || undefined,
      }
    })

    const studioPoliciesBlock = formatStudioPoliciesForPrompt(settings)

    const staticPrompt = buildStaticSystemPrompt({
      state,
      isEscalated: false,
      staffCallReason,
      customInstructions: settings.ironRules.customInstructions ?? undefined,
      healthDeclarationFormUrl: settings.healthDeclaration.formUrl,
      studioPoliciesBlock,
    })

    const isHealthValid = typeof customer.health_declaration_signed === 'boolean'
      ? (customer.health_declaration_signed && isHealthDeclarationValid(customer.health_declaration_date as string, settings.healthDeclaration.validityMonths))
      : undefined

    const latestStaffInstruction = [...effectiveMessages]
      .reverse()
      .find((m) => isVerifiedStaffInstruction(m))
    const activeStaffInstruction = latestStaffInstruction?.body
      ? extractCleanStaffInstruction(latestStaffInstruction.body as string)
      : null

    const now = new Date()
    const projectContext = await loadProjectPromptContext(su, (conversation.active_project as string) || '', now)

    const dynamicPrompt = buildDynamicSystemPrompt({
      bookingDate: mappedActiveAppointments[0]?.date ?? null,
      bookingTime: mappedActiveAppointments[0]?.timeSlot ?? null,
      activeAppointments: mappedActiveAppointments,
      tattooInfo: conversation.tattoo_info,
      customerName: (customer.name as string) || null,
      returningCustomerInfo: pastCustomerInfo.isReturning
        ? {
            pastAppointmentsCount: pastCustomerInfo.totalPastAppointments,
            lastArtistName: pastCustomerInfo.lastStaffName,
            lastTattooDescription: pastCustomerInfo.lastTattooDescription,
          }
        : null,
      healthDeclarationSigned: isHealthValid,
      healthDeclarationDate: (customer.health_declaration_date as string) || null,
      healthDeclarationValidityMonths: settings.healthDeclaration.validityMonths,
      healthDeclarationFormUrl: settings.healthDeclaration.formUrl,
      activeStaffInstruction,
      projectContext,
      now,
    })

    const history = buildHistory(effectiveMessages, conversation.last_processed_message_id as string | null)
    ensureTrailingUserMessage(history, activeStaffInstruction)
    applyAnthropicCaching(history)
    const modelInstance = getModelInstance(SYSTEM_AI_MODEL)

    const toolsCtx: BotToolsContext = {
      su,
      conversationId,
      customerId,
      runtimeConfig: settings,
      conversationState: state,
      conversationStatus: conversation.status as string,
      staffCallReason,
      waClient,
      customerPhone: (customer.phone as string) || undefined,
    }
    const allTools = buildBotTools(toolsCtx)
    const facts = toConversationFacts(activeAppointments)

    const result = await generateText({
      model: modelInstance,
      // Two system messages, deliberately split (PERF-1 + PERF-2): the static prompt
      // (rules/state/persona — identical across turns of the same state) carries the
      // cache breakpoint; the dynamic block (temporal context, booking snapshot,
      // tattoo_info) sits after it, so its churn never invalidates the cached prefix.
      system: [
        {
          role: 'system' as const,
          content: staticPrompt,
          providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } },
        },
        { role: 'system' as const, content: dynamicPrompt },
      ],
      messages: history,
      tools: allTools,
      stopWhen: ({ steps }) => stepCountIs(MAX_TOOL_STEPS)({ steps }) || Boolean(toolsCtx.didSendMessage),
      prepareStep: () => {
        const isEscalatedNow = toolsCtx.conversationStatus === 'escalated'
        const allowedNow = getAllowedToolNames(
          toolsCtx.conversationState,
          isEscalatedNow,
          toolsCtx.staffCallReason ?? staffCallReason,
          Boolean(activeStaffInstruction),
        )
        return { activeTools: applyFactGuards(allowedNow, facts).filter((n) => n in allTools) as Array<keyof typeof allTools> }
      },
      abortSignal: controller.signal,
      ...buildGenerationParams(SYSTEM_AI_MODEL, {
        temperature: 0,
        maxTokens: SYSTEM_AI_MAX_TOKENS,
      }),
    })

    // Turn telemetry (PERF-8): the one log line that says where the time and tokens went
    const tGenerated = Date.now()
    console.log(
      `[agent-timing] conv=${conversationId} state=${state} model=${SYSTEM_AI_MODEL}` +
        ` load=${tLoaded - t0}ms generate=${tGenerated - tLoaded}ms steps=${result.steps.length}` +
        ` in=${result.usage.inputTokens ?? '?'} out=${result.usage.outputTokens ?? '?'}` +
        ` anthropic=${JSON.stringify(result.providerMetadata?.anthropic ?? {})}`,
    )

    // Punctuation and dash cleanup (LANG-7)
    let replyText = cleanBotPunctuation(result.text)

    // Absolute rule (LANG-8): once the send_message tool has fired, customer already got content
    if (toolsCtx.didSendMessage) {
      replyText = ''
      if (latestInboundId) {
        await su.collection('conversations').update(conversationId, {
          last_processed_message_id: latestInboundId,
        }).catch(() => null)
      }
    }

    if (!replyText) return // a turn that only called a tool (e.g. call_staff or send_message) may have no reply

    if (controller.signal.aborted) {
      console.log(`[agent] conv=${conversationId} turn aborted before sendText`)
      return
    }

    // Verify conversation state/status hasn't changed during model generation (e.g. staff took over or triggered an action)
    const freshConv = await su.collection('conversations').getOne(conversationId).catch(() => null)
    const freshState = freshConv ? toConversationState(freshConv.state) : null
    const isBotEscalated = toolsCtx.conversationStatus === 'escalated' && Boolean(toolsCtx.staffCallReason)
    const isValidStatus = freshConv && (
      BOT_TURN_STATUSES.has(freshConv.status as string) ||
      (isBotEscalated && freshConv.status === 'escalated')
    )
    const externalStaffIntervention = Boolean(freshConv?.is_staff_called) && !isBotEscalated

    if (
      !freshConv ||
      !isValidStatus ||
      freshState !== toolsCtx.conversationState ||
      externalStaffIntervention
    ) {
      console.log(
        `[agent] conv=${conversationId} aborted before sendText: conversation status/state changed (${freshConv?.status}/${freshConv?.state})`,
      )
      return
    }

    if (!waClient || !waSettings?.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured')
    }
    const { wamid } = await waClient.sendText({ to: customer.phone as string, body: replyText })

    const nowIso = new Date().toISOString()
    // Concurrently save outbound message record and update conversation timestamp & last_processed_message_id
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
      su.collection('conversations').update(conversationId, {
        last_message_at: nowIso,
        ...(latestInboundId ? { last_processed_message_id: latestInboundId } : {}),
      }),
    ])
    console.log(`[agent-timing] conv=${conversationId} deliver=${Date.now() - tGenerated}ms total=${Date.now() - t0}ms`)
  } catch (err) {
    // A deliberate abort (new message arrived mid-turn) — swallow silently.
    // The fresh turn scheduled by the webhook will process the full context.
    if (controller.signal.aborted) {
      console.log(`[agent] conv=${conversationId} turn aborted by new inbound message`)
      return
    }
    const message = err instanceof Error ? err.message : String(err)
    const { reason, title } = classifyBotTurnError(err)
    await escalate(su, conversationId, reason, title, `שגיאה בעיבוד הודעת הבוט: ${message}`)
  } finally {
    // Always clean up — whether the turn completed, errored, or was aborted.
    if (activeTurnControllers.get(conversationId) === controller) {
      activeTurnControllers.delete(conversationId)
    }
  }
}
