/**
 * MCP Agent orchestration core. Deliberately independent of `src/integrations/ai/agent.server.ts`
 * (the WhatsApp Customer Agent) — own prompt, own tool set, own conversation storage. Channel-
 * agnostic per the design doc §8: takes a conversation id + text and returns a result, with no
 * knowledge of *how* the message arrived — `sendMcpMessage` (the web channel adapter) is the only
 * caller today, a future WhatsApp webhook adapter would be a second.
 */
import { generateText, stepCountIs } from 'ai'
import type { ModelMessage } from 'ai'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getModelInstance } from '@/integrations/ai/providers.server'
import { buildGenerationParams } from '@/integrations/ai/capabilities'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import { buildMcpSystemPrompt } from './prompts'
import { createPendingAction } from './approval'
import { buildCalendarTools } from './tool-servers/calendar.server'
import { buildLeadsTools } from './tool-servers/leads.server'
import { buildPaymentsTools } from './tool-servers/payments.server'
import { buildMessagingTools } from './tool-servers/messaging.server'
import { buildCustomerTools } from './tool-servers/customers.server'
import { buildAnalyticsTools } from './tool-servers/analytics.server'
import { buildWaitlistTools } from './tool-servers/waitlist.server'
import { buildStaffTools } from './tool-servers/staff.server'
import type { McpToolContext } from './tool-servers/shared'
import type { McpAction, McpMessage, McpToolCallSummary } from './types'

const HISTORY_LIMIT = 20
const MAX_TOOL_STEPS = 6

async function loadModelConfig(su: Awaited<ReturnType<typeof getSuperuserClient>>) {
  const list = await su.collection('settings').getList(1, 1)
  const record = list.items[0]
  return {
    model: (record?.ai_model as string) || 'claude-sonnet-5',
    temperature: (record?.ai_temperature as number | undefined) ?? 0.4,
    maxTokens: (record?.ai_max_tokens as number | undefined) ?? null,
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

export interface RunMcpTurnInput {
  staff: StaffRecord
  conversationId: string
  text: string
}

export interface RunMcpTurnResult {
  ownerMessage: McpMessage
  assistantMessage: McpMessage
  actions: McpAction[]
}

export async function runMcpTurn({ staff, conversationId, text }: RunMcpTurnInput): Promise<RunMcpTurnResult> {
  const su = await getSuperuserClient()

  const [{ items: historyRecords }, config] = await Promise.all([
    su.collection('mcp_messages').getList(1, HISTORY_LIMIT, {
      filter: `conversation = "${conversationId}"`,
      sort: '-created',
    }),
    loadModelConfig(su),
  ])
  const history = historyRecords.reverse()

  const ownerMessageRecord = await su.collection('mcp_messages').create({
    conversation: conversationId,
    role: 'owner',
    body: text,
  })

  const messages: ModelMessage[] = history.map((r) => ({
    role: r.role === 'owner' ? 'user' : 'assistant',
    content: (r.body as string) || '',
  }))
  messages.push({ role: 'user', content: text })

  const proposals: McpToolContext['proposals'] = []
  const toolCtx: McpToolContext = { su, staff, proposals }
  const tools = {
    ...buildCalendarTools(toolCtx),
    ...buildLeadsTools(toolCtx),
    ...buildPaymentsTools(),
    ...buildMessagingTools(toolCtx),
    ...buildCustomerTools(toolCtx),
    ...buildAnalyticsTools(),
    ...buildWaitlistTools(toolCtx),
    ...buildStaffTools(),
  }

  const result = await generateText({
    model: getModelInstance(config.model),
    system: buildMcpSystemPrompt({ staffName: staff.name }),
    messages,
    tools,
    stopWhen: stepCountIs(MAX_TOOL_STEPS),
    ...buildGenerationParams(config.model, { temperature: config.temperature, maxTokens: config.maxTokens }),
  })

  const toolCallSummaries: McpToolCallSummary[] = (result.toolCalls || []).map((call) => {
    const matchingResult = (result.toolResults || []).find((r) => r.toolCallId === call.toolCallId)
    const output = matchingResult?.output as { status?: string; message?: string; data?: unknown } | undefined
    return {
      toolName: call.toolName,
      args: call.input as Record<string, unknown>,
      status: (output?.status as McpToolCallSummary['status']) || 'success',
      summary: output?.message || call.toolName,
      rowCount: Array.isArray(output?.data) ? output.data.length : undefined,
      data: Array.isArray(output?.data) ? output.data.slice(0, 20) : output?.data,
    }
  })

  const assistantMessageRecord = await su.collection('mcp_messages').create({
    conversation: conversationId,
    role: 'assistant',
    body: result.text.trim(),
    tool_calls: toolCallSummaries,
  })

  const actions: McpAction[] = []
  for (const proposal of proposals) {
    const action = await createPendingAction({
      conversationId,
      messageId: assistantMessageRecord.id,
      toolName: proposal.toolName,
      args: proposal.args,
      diff: proposal.diff,
    })
    actions.push(action)
  }

  await su.collection('mcp_conversations').update(conversationId, {
    last_message_at: new Date().toISOString(),
  })

  return {
    ownerMessage: toMcpMessage(ownerMessageRecord),
    assistantMessage: toMcpMessage(assistantMessageRecord),
    actions,
  }
}
