import type { ModelMessage } from 'ai'
import { STAFF_MESSAGE_TAG } from '../prompts'
import { isVerifiedStaffInstruction } from './staff-instruction'

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
  let body = (r.body as string) || ''
  if (body.includes(STAFF_MESSAGE_TAG)) {
    body = body.replaceAll(STAFF_MESSAGE_TAG, '[ציטוט]')
  }
  const type = r.type as string
  if (!type || type === 'text') return body || '[הודעה ללא טקסט]'
  const label = MEDIA_TYPE_LABELS[type] ?? 'קובץ מצורף'
  return body ? `[הלקוח שלח ${label}] ${body}` : `[הלקוח שלח ${label}]`
}

/** Bounded-recency history, mapped to AI SDK roles. Staff-authored outbound messages are
 *  narrated with `STAFF_MESSAGE_TAG`. Internal operator instructions (marked with internal_staff_)
 *  are placed in `user`-role so they prompt the model directly and avoid assistant message prefill
 *  errors. Outbound messages sent to the customer are placed in `assistant`-role. */
function mapRecordToMessage(r: Record<string, unknown>): ModelMessage | null {
  const body = (r.body as string) || ''
  if (r.direction === 'inbound') {
    return { role: 'user', content: [{ type: 'text', text: describeInboundBody(r) }] }
  }
  if (r.sender_type === 'ai_bot') {
    return { role: 'assistant', content: [{ type: 'text', text: body }] }
  }
  if (r.sender_type === 'staff' && body) {
    const isInternalInstruction =
      (typeof r.whatsapp_message_id === 'string' && r.whatsapp_message_id.startsWith('internal_staff_')) ||
      isVerifiedStaffInstruction(r)
    if (isInternalInstruction) {
      return null
    }
    return { role: 'assistant', content: [{ type: 'text', text: `${STAFF_MESSAGE_TAG} ${body}` }] }
  }
  return null
}

/** Reorders records so that messages that arrived *after* `lastProcessedId` but before
 *  the bot finished its previous turn are moved to the end of the history. This prevents
 *  a race condition where a rapid second message appears in the history between two bot
 *  turns, breaking the user → assistant → user alternation that LLMs require.
 *
 *  Example: [msg1, msg2, bot1] with lastProcessedId="msg1" → [msg1, bot1, msg2] */
export function normalizeMessageOrder(
  records: Array<Record<string, unknown>>,
  lastProcessedId?: string | null,
): Array<Record<string, unknown>> {
  if (!lastProcessedId || records.length === 0) return records
  const lastIdx = records.findIndex((r) => r.id === lastProcessedId)
  if (lastIdx === -1) return records

  // Collect inbound messages that arrived after lastProcessedId (they were stored to DB
  // during the previous generation window and should be treated as the new turn's input).
  const before = records.slice(0, lastIdx + 1)
  const after = records.slice(lastIdx + 1)
  const interleaved = after.filter((r) => r.direction === 'inbound')
  const replied = after.filter((r) => r.direction !== 'inbound')

  // If there are no unreplied messages, the order is already correct.
  if (interleaved.length === 0) return records

  return [...before, ...replied, ...interleaved]
}

/** Merge consecutive messages with the same role into a single turn, joining their text
 *  content with newlines. Anthropic's API rejects adjacent same-role messages with a 400,
 *  so this is a hard requirement whenever the customer sends multiple messages in a burst
 *  or when a staff member sends several messages in a row. */
export function coalesceHistory(messages: ModelMessage[]): ModelMessage[] {
  if (messages.length === 0) return messages
  const result: ModelMessage[] = []
  for (const msg of messages) {
    const prev = result[result.length - 1]
    if (prev && prev.role === msg.role) {
      // Merge: concatenate all text parts from the incoming message into the previous one.
      const prevTexts = (prev.content as Array<{ type: 'text'; text: string }>)
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
      const newTexts = Array.isArray(msg.content)
        ? (msg.content as Array<{ type: 'text'; text: string }>)
            .filter((p) => p.type === 'text')
            .map((p) => p.text)
        : [String(msg.content)]
      prev.content = [{ type: 'text', text: [...prevTexts, ...newTexts].join('\n') }]
    } else {
      // Different role — normalize content to text array form for consistency.
      if (msg.role === 'user') {
        result.push({
          role: 'user',
          content: Array.isArray(msg.content)
            ? (msg.content as Array<{ type: 'text'; text: string }>)
            : [{ type: 'text', text: String(msg.content) }],
        })
      } else if (msg.role === 'assistant') {
        result.push({
          role: 'assistant',
          content: Array.isArray(msg.content)
            ? (msg.content as Array<{ type: 'text'; text: string }>)
            : [{ type: 'text', text: String(msg.content) }],
        })
      } else {
        result.push(msg)
      }
    }
  }
  return result
}

/** Chronological history mapped to AI SDK roles. Accepts an optional `lastProcessedId`
 *  to reorder race-condition messages, then coalesces consecutive same-role turns so the
 *  Anthropic API never sees adjacent messages with identical roles. */
export function buildHistory(
  records: Array<Record<string, unknown>>,
  lastProcessedId?: string | null,
): ModelMessage[] {
  const ordered = normalizeMessageOrder(records, lastProcessedId)
  const mapped = ordered
    .map(mapRecordToMessage)
    .filter((m): m is ModelMessage => m !== null)
  return coalesceHistory(mapped)
}

/** Enforces the LLM chat completion invariant: the messages array sent to generateText
 *  MUST end with a 'user' turn. If history ends with an 'assistant' message (e.g. after a
 *  staff outbound reply or when manually resumed without an instruction), Anthropic rejects
 *  the call with "This model does not support assistant message prefill. The conversation
 *  must end with a user message." Appending a system prompt directive satisfies the API
 *  contract and prompts the model to continue the conversation. */
export function ensureTrailingUserMessage(
  history: ModelMessage[],
  activeStaffInstruction?: string | null,
): ModelMessage[] {
  const cleanInstruction = activeStaffInstruction?.trim()
  const directiveText = cleanInstruction
    ? `[הוראת מפעיל מצוות הסטודיו: "${cleanInstruction}". פעל לפי הוראה זו מיידית מול הלקוח והפעל את הכלים הנדרשים.]`
    : null

  if (history.length === 0) {
    history.push({
      role: 'user',
      content: [{ type: 'text', text: directiveText || '[הוראת מערכת: התחל שיחה מול הלקוח]' }],
    })
  } else if (history[history.length - 1]?.role === 'assistant') {
    history.push({
      role: 'user',
      content: [{
        type: 'text',
        text: directiveText || '[הוראת מערכת: המשך שיחה ומענה מול הלקוח בהתאם להקשר האחרון ולשלב הנוכחי]',
      }],
    })
  } else if (directiveText) {
    const last = history[history.length - 1]!
    const currentText = Array.isArray(last.content)
      ? (last.content as Array<{ type: 'text'; text: string }>).map((p) => p.text).join('\n')
      : String(last.content)
    last.content = [{
      type: 'text',
      text: `${currentText}\n\n${directiveText}`,
    }]
  }
  return history
}

/** Cache breakpoints on the two newest odd-offset history messages, so next turn's
 *  longest shared prefix is re-read from cache instead of re-priced. Breakpoint budget:
 *  Anthropic allows 4 per request — 1 is spent on the static system prompt (see
 *  run-bot-turn.server.ts's `generateText` call), these use 2 more, leaving 1 spare. */
export function applyAnthropicCaching(history: ModelMessage[]) {
  const indices = [history.length - 1, history.length - 3]
  for (const idx of indices) {
    if (idx >= 0 && history[idx]) {
      history[idx].providerOptions = {
        anthropic: { cacheControl: { type: 'ephemeral' as const } },
      }
    }
  }
}
