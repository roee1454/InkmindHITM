import { useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { formatTime } from '@/features/conversations/lib/format'
import { McpMarkdown } from './McpMarkdown'
import type { McpMessage } from '../types'

interface McpAssistantTurnProps {
  message: McpMessage
}

/** Splits markdown into paragraph-ish blocks (blank-line separated) so the reveal animation can
 *  stagger by block instead of by raw character — revealing markdown syntax mid-character (e.g.
 *  a half-typed `**bold**`) looks broken, so each block is parsed as a whole once it appears. */
function splitBlocks(text: string): string[] {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0)
  return blocks.length > 0 ? blocks : [text]
}

/** Gemini-style assistant turn: no bubble, no background — full-width flowing text with an
 *  icon badge at the start of the reading direction (the right edge in RTL, handled for free by
 *  `items-start` under the panel's `dir="rtl"` ancestor). Owner messages stay in `McpMessageBubble`;
 *  this is assistant-only. */
export function McpAssistantTurn({ message }: McpAssistantTurnProps) {
  const blocks = useMemo(() => splitBlocks(message.body), [message.body])
  const reducedMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(reducedMotion ? blocks.length : 0)

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(blocks.length)
      return
    }
    setRevealed(0)
    if (blocks.length === 0) return
    let i = 0
    const interval = window.setInterval(() => {
      i += 1
      setRevealed(i)
      if (i >= blocks.length) window.clearInterval(interval)
    }, 90)
    return () => window.clearInterval(interval)
    // `blocks` intentionally excluded from deps — it's derived from message.id via useMemo, so
    // re-running this effect whenever message.id changes is sufficient.
  }, [message.id, reducedMotion])

  if (!message.body) return null

  return (
    <div className="flex items-start gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles size={13} />
      </span>
      <div className="min-w-0 flex-1">
        {blocks.slice(0, revealed).map((block, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">
            <McpMarkdown text={block} />
          </div>
        ))}
        <div className="mt-1 text-micro text-muted-foreground">{formatTime(message.created)}</div>
      </div>
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}
