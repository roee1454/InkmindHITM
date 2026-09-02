import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import { runMcpTurn } from './agent'
import { executeAction, cancelPendingAction, setActionEditing, undoDoneAction } from './approval'
import type { McpAction, McpActionDiff, McpConversation, McpMessage, McpToolCallSummary } from './types'

const MAX_CONVERSATIONS_PER_STAFF = 30

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

function toMcpConversation(record: Record<string, unknown>): McpConversation {
  return {
    id: record.id as string,
    title: (record.title as string) || 'שיחה חדשה',
    channel: (record.channel as McpConversation['channel']) || 'web',
    lastMessageAt: (record.last_message_at as string) || null,
    lastReadAt: (record.last_read_at as string) || null,
    created: record.created as string,
  }
}

function toMcpMessage(record: Record<string, unknown>): McpMessage {
  return {
    id: record.id as string,
    conversationId: record.conversation as string,
    role: record.role as McpMessage['role'],
    body: (record.body as string) || '',
    toolCalls: (record.tool_calls as McpToolCallSummary[]) || [],
    created: record.created as string,
  }
}

function toMcpAction(record: Record<string, unknown>): McpAction {
  return {
    id: record.id as string,
    conversationId: record.conversation as string,
    messageId: record.message as string,
    toolName: record.tool_name as string,
    args: (record.args as Record<string, unknown>) || {},
    status: record.status as McpAction['status'],
    diff: (record.diff as McpActionDiff) || { summary: '', rows: [] },
    executedAt: (record.executed_at as string) || null,
    undoExpiresAt: (record.undo_expires_at as string) || null,
    created: record.created as string,
  }
}

/** Retention (doc §7 footer copy, "נשמרות 30 השיחות האחרונות") — pruned inline on create
 *  rather than a separate scheduled job. Cascade-delete on the collection removes the pruned
 *  conversation's messages/actions automatically. */
async function pruneOldConversations(staffId: string) {
  const su = await getSuperuserClient()
  const { items, totalItems } = await su.collection('mcp_conversations').getList(1, 200, {
    filter: `staff = "${staffId}"`,
    sort: '-last_message_at',
    fields: 'id',
  })
  if (totalItems <= MAX_CONVERSATIONS_PER_STAFF) return
  const toDelete = items.slice(MAX_CONVERSATIONS_PER_STAFF)
  await Promise.all(toDelete.map((r) => su.collection('mcp_conversations').delete(r.id).catch(() => null)))
}

export const listMcpConversations = createServerFn({ method: 'GET' }).handler(async (): Promise<McpConversation[]> => {
  const session = await requireSession()
  const su = await getSuperuserClient()
  const records = await su.collection('mcp_conversations').getFullList({
    filter: `staff = "${session.staff.id}"`,
    sort: '-last_message_at',
  })
  return records.map(toMcpConversation)
})

/** Powers `McpBubble`'s red "needs-approval" badge — the count of `pending` actions across every
 *  one of the signed-in staff member's MCP conversations, not just the currently open one. */
export const getMcpPendingActionsCount = createServerFn({ method: 'GET' }).handler(async (): Promise<number> => {
  const session = await requireSession()
  const su = await getSuperuserClient()
  const conversations = await su.collection('mcp_conversations').getFullList({
    filter: `staff = "${session.staff.id}"`,
    fields: 'id',
  })
  if (conversations.length === 0) return 0
  const conversationFilter = conversations.map((c) => `conversation = "${c.id}"`).join(' || ')
  const { totalItems } = await su.collection('mcp_actions').getList(1, 1, {
    filter: `status = "pending" && (${conversationFilter})`,
  })
  return totalItems
})

const getConversationSchema = z.object({ conversationId: z.string() })

export const getMcpConversation = createServerFn({ method: 'GET' })
  .validator(getConversationSchema)
  .handler(async ({ data }): Promise<{ conversation: McpConversation; messages: McpMessage[]; actions: McpAction[] }> => {
    const session = await requireSession()
    const su = await getSuperuserClient()
    const conversation = await su.collection('mcp_conversations').getOne(data.conversationId)
    if (conversation.staff !== session.staff.id) throw new Error('אין הרשאה לצפות בשיחה זו.')
    const [messages, actions] = await Promise.all([
      su.collection('mcp_messages').getFullList({ filter: `conversation = "${data.conversationId}"`, sort: 'created' }),
      su.collection('mcp_actions').getFullList({ filter: `conversation = "${data.conversationId}"`, sort: 'created' }),
    ])
    return {
      conversation: toMcpConversation(conversation),
      messages: messages.map(toMcpMessage),
      actions: actions.map(toMcpAction),
    }
  })

const deleteConversationSchema = z.object({ conversationId: z.string() })

/** Cascade-delete on `mcp_messages`/`mcp_actions` (see the `mcp_assistant` migration) removes
 *  the conversation's messages and actions automatically — no manual cleanup needed here. */
export const deleteMcpConversation = createServerFn({ method: 'POST' })
  .validator(deleteConversationSchema)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const session = await requireSession()
    const su = await getSuperuserClient()
    const conversation = await su.collection('mcp_conversations').getOne(data.conversationId)
    if (conversation.staff !== session.staff.id) throw new Error('אין הרשאה למחוק שיחה זו.')
    await su.collection('mcp_conversations').delete(data.conversationId)
    return { id: data.conversationId }
  })

export const createMcpConversation = createServerFn({ method: 'POST' }).handler(async (): Promise<McpConversation> => {
  const session = await requireSession()
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_conversations').create({
    staff: session.staff.id,
    title: 'שיחה חדשה',
    channel: 'web',
  })
  await pruneOldConversations(session.staff.id)
  return toMcpConversation(record)
})

const sendMessageSchema = z.object({ conversationId: z.string(), text: z.string().min(1).max(4000) })

export const sendMcpMessage = createServerFn({ method: 'POST' })
  .validator(sendMessageSchema)
  .handler(async ({ data }): Promise<{ assistantMessage: McpMessage; actions: McpAction[] }> => {
    const session = await requireSession()
    const su = await getSuperuserClient()
    const conversation = await su.collection('mcp_conversations').getOne(data.conversationId)
    if (conversation.staff !== session.staff.id) throw new Error('אין הרשאה לשיחה זו.')

    // Auto-title from the first message, so a fresh "שיחה חדשה" gets a real name without an
    // extra round trip from the client.
    const isFirstMessage = !(await su
      .collection('mcp_messages')
      .getFirstListItem(`conversation = "${data.conversationId}"`)
      .then(() => true)
      .catch(() => false))
    if (isFirstMessage) {
      const title = data.text.length > 60 ? `${data.text.slice(0, 57)}…` : data.text
      await su.collection('mcp_conversations').update(data.conversationId, { title })
    }

    const result = await runMcpTurn({ staff: session.staff, conversationId: data.conversationId, text: data.text })
    return { assistantMessage: result.assistantMessage, actions: result.actions }
  })

const markConversationReadSchema = z.object({ conversationId: z.string() })

export const markConversationRead = createServerFn({ method: 'POST' })
  .validator(markConversationReadSchema)
  .handler(async ({ data }): Promise<McpConversation> => {
    const session = await requireSession()
    const su = await getSuperuserClient()
    const conversation = await su.collection('mcp_conversations').getOne(data.conversationId)
    if (conversation.staff !== session.staff.id) throw new Error('אין הרשאה לשיחה זו.')
    const updated = await su
      .collection('mcp_conversations')
      .update(data.conversationId, { last_read_at: new Date().toISOString() })
    return toMcpConversation(updated)
  })

const actionIdSchema = z.object({ actionId: z.string() })

export const approveAction = createServerFn({ method: 'POST' })
  .validator(actionIdSchema)
  .handler(async ({ data }): Promise<McpAction> => {
    await requireSession()
    const action = await executeAction(data.actionId)
    return action
  })

export const cancelAction = createServerFn({ method: 'POST' })
  .validator(actionIdSchema)
  .handler(async ({ data }): Promise<McpAction> => {
    await requireSession()
    return cancelPendingAction(data.actionId)
  })

export const undoAction = createServerFn({ method: 'POST' })
  .validator(actionIdSchema)
  .handler(async ({ data }): Promise<McpAction> => {
    await requireSession()
    return undoDoneAction(data.actionId)
  })

const editActionSchema = z.object({
  actionId: z.string(),
  editing: z.boolean(),
  args: z.record(z.string(), z.unknown()).optional(),
})

export const editAction = createServerFn({ method: 'POST' })
  .validator(editActionSchema)
  .handler(async ({ data }): Promise<McpAction> => {
    await requireSession()
    let action = await setActionEditing(data.actionId, data.editing)
    if (data.args) {
      const su = await getSuperuserClient()
      const updated = await su.collection('mcp_actions').update(data.actionId, { args: data.args })
      action = toMcpAction(updated)
    }
    return action
  })
