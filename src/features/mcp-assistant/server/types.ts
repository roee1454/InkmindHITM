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

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface McpToolCallSummary {
  toolName: string
  args: Record<string, JsonValue>
  status: 'success' | 'error' | 'pending_approval'
  summary: string
  rowCount?: number
  /** First 20 rows only (see agent.ts) — enough for "show data" in `McpToolCallCard` without
   *  risking the `mcp_messages.tool_calls` json field's size cap on a large list result. */
  data?: JsonValue
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
   
  args: Record<string, any>
  status: McpActionStatus
  diff: McpActionDiff
  executedAt: string | null
  undoExpiresAt: string | null
  created: string
}
