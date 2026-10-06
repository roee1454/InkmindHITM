import type { UIConversation } from '../types'

type BotTurnPhase = Exclude<UIConversation['botTurnPhase'], ''>

/**
 * The bot's turn, on the studio's side of the thread: shaped like the bot's own bubble. `cooldown`
 * waits a few seconds for the customer's next message; `typing` means it is writing the reply.
 */
export function BotTypingIndicator({ phase }: { phase: BotTurnPhase }) {
  const typing = phase === 'typing'
  return (
    <div className="flex justify-start" data-testid="bot-typing-indicator" data-phase={phase} role="status">
      <div className="flex items-center gap-2 rounded-xl rounded-ss-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
        {typing && (
          <span className="flex items-center gap-1" aria-hidden>
            {[0, 150, 300].map((delay) => (
              <span key={delay} className="size-1.5 rounded-full bg-muted-foreground motion-safe:animate-pulse" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </span>
        )}
        <span>{typing ? 'הבוט כותב…' : 'הבוט ממתין להודעות נוספות'}</span>
      </div>
    </div>
  )
}
