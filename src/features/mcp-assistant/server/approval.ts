import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { commitCalendarAction, CALENDAR_WRITE_TOOLS } from './tool-servers/calendar.server'
import { commitLeadsAction, LEADS_WRITE_TOOLS } from './tool-servers/leads.server'
import { commitMessagingAction, MESSAGING_WRITE_TOOLS } from './tool-servers/messaging.server'
import { commitCustomersAction, CUSTOMERS_WRITE_TOOLS } from './tool-servers/customers.server'
import { commitWaitlistAction, WAITLIST_WRITE_TOOLS } from './tool-servers/waitlist.server'
import type { McpAction, McpActionDiff } from './types'

/** Exported (not just module-private) so tests can assert against the real source of truth
 *  instead of re-deriving the union by hand — see `tool-registration.test.ts`. */
export const WRITE_TOOL_NAMES = new Set([
  ...CALENDAR_WRITE_TOOLS,
  ...LEADS_WRITE_TOOLS,
  ...MESSAGING_WRITE_TOOLS,
  ...CUSTOMERS_WRITE_TOOLS,
  ...WAITLIST_WRITE_TOOLS,
])

const UNDO_WINDOW_MS = 5 * 60 * 1000

/** The single chokepoint every tool server's write path must go through (doc §4) — nothing else
 *  in this feature decides whether a tool call needs approval, and nothing else calls a
 *  `commit*Action` function. */
export function requiresApproval(toolName: string): boolean {
  return WRITE_TOOL_NAMES.has(toolName)
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

export async function createPendingAction(input: {
  conversationId: string
  messageId: string
  toolName: string
  args: Record<string, unknown>
  diff: McpActionDiff
}): Promise<McpAction> {
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_actions').create({
    conversation: input.conversationId,
    message: input.messageId,
    tool_name: input.toolName,
    args: input.args,
    diff: input.diff,
    status: 'pending',
  })
  return toMcpAction(record)
}

/** Exported for `approval.test.ts` — every other caller in the feature still only reaches this
 *  indirectly, through `executeAction` below. */
export function dispatchCommit(toolName: string, args: Record<string, unknown>): Promise<string> {
  if (CALENDAR_WRITE_TOOLS.has(toolName)) return commitCalendarAction(toolName, args)
  if (LEADS_WRITE_TOOLS.has(toolName)) return commitLeadsAction(toolName, args)
  if (MESSAGING_WRITE_TOOLS.has(toolName)) return commitMessagingAction(toolName, args)
  if (CUSTOMERS_WRITE_TOOLS.has(toolName)) return commitCustomersAction(toolName, args)
  if (WAITLIST_WRITE_TOOLS.has(toolName)) return commitWaitlistAction(toolName, args)
  throw new Error(`No commit handler registered for tool "${toolName}"`)
}

/** Runs the real mutation for a `pending`/`editing` action and locks it into `done` with a
 *  5-minute undo window. This — plus `cancelPendingAction` below — are the only two functions in
 *  the whole feature allowed to call a tool server's `commit*Action`. */
export async function executeAction(actionId: string, overrideArgs?: Record<string, unknown>): Promise<McpAction> {
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_actions').getOne(actionId)
  if (record.status !== 'pending' && record.status !== 'editing') {
    throw new Error('הפעולה כבר טופלה.')
  }
  const args = overrideArgs || (record.args as Record<string, unknown>)
  await su.collection('mcp_actions').update(actionId, { status: 'executing' })
  try {
    const resultMessage = await dispatchCommit(record.tool_name as string, args)
    const now = new Date()
    const undoExpiresAt = new Date(now.getTime() + UNDO_WINDOW_MS)
    const updated = await su.collection('mcp_actions').update(actionId, {
      status: 'done',
      args,
      executed_at: now.toISOString(),
      undo_expires_at: undoExpiresAt.toISOString(),
      diff: { ...(record.diff as McpActionDiff), summary: `${(record.diff as McpActionDiff)?.summary || ''} — ${resultMessage}` },
    })
    return toMcpAction(updated)
  } catch (error) {
    await su.collection('mcp_actions').update(actionId, { status: 'pending' })
    throw error instanceof Error ? error : new Error('שגיאה בביצוע הפעולה.')
  }
}

export async function cancelPendingAction(actionId: string): Promise<McpAction> {
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_actions').update(actionId, { status: 'cancelled' })
  return toMcpAction(record)
}

export async function setActionEditing(actionId: string, editing: boolean): Promise<McpAction> {
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_actions').update(actionId, { status: editing ? 'editing' : 'pending' })
  return toMcpAction(record)
}

/** Reschedule/cancel/lead-stage/messaging all have distinct undo semantics — for v1 the undo
 *  window simply marks the action `cancelled` without an inverse mutation, since the write tools
 *  currently in scope (reschedule/cancel/update stage/send message) don't have a universal
 *  automatic inverse (a sent WhatsApp message can't be unsent). Staff can always re-open the
 *  panel and ask the assistant to reverse a specific action in plain language, which goes back
 *  through the normal approval flow. */
export async function undoDoneAction(actionId: string): Promise<McpAction> {
  const su = await getSuperuserClient()
  const record = await su.collection('mcp_actions').getOne(actionId)
  if (record.status !== 'done') throw new Error('הפעולה אינה במצב שניתן לבטל.')
  if (!record.undo_expires_at || new Date(record.undo_expires_at as string).getTime() < Date.now()) {
    throw new Error('חלון הביטול הסתיים.')
  }
  const updated = await su.collection('mcp_actions').update(actionId, { status: 'cancelled' })
  return toMcpAction(updated)
}
