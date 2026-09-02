export interface McpConversation {
  id: string
  title: string
  channel: 'web' | 'whatsapp'
  lastMessageAt: string | null
  /** Last time the staff member actually viewed this conversation's messages — persisted so
   *  the bubble's unread indicator survives a page reload, unlike client-only UI state. */
  lastReadAt: string | null
  created: string
}

export interface McpToolCallSummary {
  toolName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tool args are arbitrary JSON;
  // `Record<string, unknown>` trips TanStack Start's serializable-return-type checker on the
  // `createServerFn` handlers that return these (see mcp-conversations.ts).
  args: Record<string, any>
  status: 'success' | 'error' | 'pending_approval'
  summary: string
  rowCount?: number
  /** First 20 rows only (see agent.ts) — enough for "show data" in `McpToolCallCard` without
   *  risking the `mcp_messages.tool_calls` json field's size cap on a large list result. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see args above
  data?: any
}

export interface McpMessage {
  id: string
  conversationId: string
  role: 'owner' | 'assistant'
  body: string
  toolCalls: McpToolCallSummary[]
  created: string
}

export type McpActionStatus = 'pending' | 'editing' | 'executing' | 'done' | 'cancelled'

export interface McpActionDiffRow {
  label: string
  before: string
  after: string
}

export interface McpActionDiff {
  summary: string
  rows: McpActionDiffRow[]
}

export interface McpAction {
  id: string
  conversationId: string
  messageId: string
  toolName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see McpToolCallSummary.args
  args: Record<string, any>
  status: McpActionStatus
  diff: McpActionDiff
  executedAt: string | null
  undoExpiresAt: string | null
  created: string
}
