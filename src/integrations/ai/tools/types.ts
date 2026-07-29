import type PocketBase from 'pocketbase'
import type { ConversationState } from '../prompts'
import type { WhatsAppClient } from '@/integrations/whatsapp-cloud-api/client'
import type { Tool } from 'ai'
import type { z } from 'zod'

export interface ToolFactoryContext {
  su: PocketBase
  conversationId: string
  customerId: string
  /** Live conversation state — updated mid-turn by `transitionState`, so `prepareStep`
   *  in agent.server.ts re-gates the tool set after a state-changing tool (FLOW-8).
   *  Note: factories that destructure this capture the turn-START value. */
  conversationState: ConversationState
  /** Live status ('bot_active' | 'escalated' | …) — synced by `updateConversation`
   *  whenever a tool escalates, for the same mid-turn re-gating. */
  conversationStatus?: string
  staffCallReason?: string | null
  waClient?: WhatsAppClient
  customerPhone?: string
  didSendMessage?: boolean

  // Common Helpers
  updateConversation: (fields: any) => Promise<any>
  /** The only sanctioned way for a tool to change conversation `state` (FLOW-5):
   *  validates against the transition table, then syncs the live ctx fields above.
   *  Direct `updateConversation({ state })` is forbidden — use this. */
  transitionState: (
    to: ConversationState,
    opts: { reason: string; extraFields?: Record<string, unknown> },
  ) => Promise<{ from: ConversationState }>
  notifyStaff: (
    title: string,
    message: string,
    type?: 'info' | 'warning' | 'error',
    link?: string
  ) => Promise<any>
  // `Tool` (default generics), not `ReturnType<typeof tool>` — the latter collapses the
  // generic to `Tool<never, never>`, which no concretely-typed tool is assignable to.
  botTool: <T extends z.ZodTypeAny>(
    description: string,
    inputSchema: T,
    execute: (input: z.infer<T>) => Promise<any>
  ) => Tool
}
