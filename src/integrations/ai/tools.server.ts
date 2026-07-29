import { tool } from 'ai'
import { z } from 'zod'
import type PocketBase from 'pocketbase'
import { addSystemNotification } from '@/features/notifications/server/notifications'
import { transition } from '@/features/conversations/server/state-machine'
import type { ConversationState } from './prompts'
import type { WhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import type { ToolFactoryContext } from './tools/types'
import { buildBaseTools } from './tools/base.server'
import { buildArtistTools } from './tools/artist.server'
import { buildBookingTools } from './tools/booking.server'
import { buildSupportTools } from './tools/support.server'
import { buildDateTools } from './tools/datetime.server'

export interface BotToolsContext {
  su: PocketBase
  conversationId: string
  customerId: string
  /** Mutable during a turn — see ToolFactoryContext for the mid-turn re-gating contract. */
  conversationState: ConversationState
  conversationStatus?: string
  staffCallReason?: string | null
  waClient?: WhatsAppClient
  customerPhone?: string
  didSendMessage?: boolean
}

export function buildBotTools(ctx: BotToolsContext) {
  const {
    su,
    conversationId,
    customerId,
    conversationState,
    waClient,
    customerPhone,
  } = ctx

  // Local helper to update the conversation record in PocketBase. Status/escalation
  // changes are mirrored into the shared ctx so prepareStep (agent.server.ts) re-gates
  // the tool set mid-turn (FLOW-8). Conversation *state* must never go through here —
  // that's transitionState's job (FLOW-5); the guard makes the contract unmissable.
  const updateConversation = (fields: any) => {
    if (fields && 'state' in fields) {
      throw new Error('updateConversation must not change `state` — use transitionState (state-machine.ts)')
    }
    if (fields?.status) ctx.conversationStatus = fields.status as string
    if (fields && 'staff_call_reason' in fields) ctx.staffCallReason = (fields.staff_call_reason as string) || null
    return su.collection('conversations').update(conversationId, fields)
  }

  // The single sanctioned path for tools to move the conversation through the booking
  // funnel: validates against the transition table, then syncs the live ctx fields.
  const transitionState = async (
    to: ConversationState,
    opts: { reason: string; extraFields?: Record<string, unknown> },
  ) => {
    const result = await transition(su, conversationId, to, { actor: 'bot', ...opts })
    ctx.conversationState = to
    const extra = opts.extraFields
    if (extra?.status) ctx.conversationStatus = extra.status as string
    if (extra && 'staff_call_reason' in extra) ctx.staffCallReason = (extra.staff_call_reason as string) || null
    return result
  }

  // Local helper to send a system notification for the current conversation
  const notifyStaff = (title: string, message: string, type: 'info' | 'warning' | 'error' = 'warning', link?: string) =>
    addSystemNotification({
      title,
      message,
      type,
      link: link || `/dashboard/conversations?chatId=${conversationId}`,
    }).catch(() => null)

  // Local helper wrapper around Vercel AI SDK's tool() helper to capture exceptions uniformly
  const botTool = <T extends z.ZodTypeAny>(
    description: string,
    inputSchema: T,
    execute: (input: z.infer<T>) => Promise<any>
  ) => {
    return tool({
      description,
      inputSchema,
      execute: async (input) => {
        try {
          return await execute(input as z.Infer<T>)
        } catch (error) {
          console.error(`[AI Tool Error]`, error)
          return {
            status: 'error',
            message: 'התרחשה תקלה טכנית בגישה לבסיס הנתונים. אנא קרא ל-call_staff עם הסיבה unhandled_query.',
          }
        }
      }
    })
  }

  // Build the shared factory context using getters and setters for mutable state
  const factoryCtx: ToolFactoryContext = {
    su,
    conversationId,
    customerId,
    conversationState,
    waClient,
    customerPhone,
    updateConversation,
    transitionState,
    notifyStaff,
    botTool,
    get didSendMessage() {
      return ctx.didSendMessage
    },
    set didSendMessage(v) {
      ctx.didSendMessage = v
    },
  }

  return {
    ...buildBaseTools(factoryCtx),
    ...buildArtistTools(factoryCtx),
    ...buildBookingTools(factoryCtx),
    ...buildSupportTools(factoryCtx),
    ...buildDateTools(factoryCtx),
  }
}
