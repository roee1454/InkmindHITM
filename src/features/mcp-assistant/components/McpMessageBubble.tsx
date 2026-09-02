import { formatTime } from '@/features/conversations/lib/format'
import type { McpMessage } from '../types'

interface McpMessageBubbleProps {
  message: McpMessage
}

/** Owner (staff) messages only — the assistant's own answers render bubble-free via
 *  `McpAssistantTurn` instead (Gemini-style flowing text). Deliberately not a reuse of
 *  `conversations/MessageBubble.tsx` — that component renders `UIMessage` (WhatsApp delivery
 *  ticks, media categories), which has no equivalent here. */
export function McpMessageBubble({ message }: McpMessageBubbleProps) {
  if (!message.body) return null

  return (
    // `justify-start` — under this panel's `dir="rtl"`, flex's main-axis start is the *right*
    // edge, so `justify-end` (the LTR-chat-app instinct) would actually push this to the left.
    <div className="flex animate-in fade-in slide-in-from-bottom-1 justify-start duration-300 motion-reduce:animate-none">
      <div className="max-w-[84%] rounded-2xl bg-primary px-3.5 py-2.5 font-assistant text-sm text-primary-foreground shadow-sm">
        <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
        <div className="mt-1 text-micro text-primary-foreground/70">{formatTime(message.created)}</div>
      </div>
    </div>
  )
}
