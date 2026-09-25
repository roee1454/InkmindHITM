import React from 'react'
import { ShieldCheck, Lock } from '@/components/ui/icon'

export const AiModelCard: React.FC = () => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card/60 px-4 py-2.5 text-xs font-assistant transition-colors shadow-2xs"
      dir="rtl"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="font-semibold text-foreground">Claude Sonnet 5</span>
        <span className="text-muted-foreground text-2xs sm:text-xs">• Adaptive Thinking מובנה</span>
      </div>

      <div className="flex items-center gap-2 text-2xs text-muted-foreground me-0 sm:me-1">
        <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5">
          <Lock size={11} className="text-muted-foreground/80" />
          מודל קבוע
        </span>
        <span className="inline-flex items-center gap-1 text-primary font-medium">
          <ShieldCheck size={13} />
          מקודד ומאובטח
        </span>
      </div>
    </div>
  )
}

export default AiModelCard

