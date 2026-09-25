import { Bot } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

export type BotTurnPhase = 'cooldown' | 'typing'

interface BotTypingIndicatorProps {
  phase: BotTurnPhase
}

export function BotTypingIndicator({ phase }: BotTypingIndicatorProps) {
  const isTyping = phase === 'typing'

  return (
    <div
      className="group relative flex justify-start items-center gap-2 font-assistant my-1"
      dir="rtl"
      data-testid="bot-typing-indicator"
      data-phase={phase}
    >
      <div className="rounded-2xl rounded-ss-xs border border-primary/20 bg-card/90 px-3.5 py-2 shadow-2xs flex items-center gap-2.5">
        <div className="flex items-center gap-1 text-2xs font-extrabold text-primary">
          <Bot className={cn('size-3.5 text-primary', isTyping && 'animate-pulse')} />
          <span>Inkmind</span>
        </div>
        {isTyping && (
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
            <span className="size-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
            <span className="size-1.5 rounded-full bg-primary/70 animate-bounce" />
          </div>
        )}
        <span className="text-2xs text-muted-foreground font-medium select-none">
          {isTyping ? 'בוט מקליד...' : 'ממתין להודעות נוספות'}
        </span>
      </div>
    </div>
  )
}
