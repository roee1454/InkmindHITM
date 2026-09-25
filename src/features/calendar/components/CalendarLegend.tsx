import React from 'react'
import { Info, Needle, PencilLine, TriangleAlert } from '@/components/ui/icon'

const BUSY_STRIPES_PREVIEW: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(148, 148, 148, 0.25) 4px, rgba(148, 148, 148, 0.25) 8px)',
}

export const CalendarLegend: React.FC = () => {
  return (
    <div
      dir="rtl"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border bg-muted/20 px-4 py-2.5 font-assistant text-2xs text-muted-foreground select-none"
    >
      <div className="flex items-center gap-1.5 font-bold text-foreground/80 shrink-0">
        <Info size={13} className="text-muted-foreground shrink-0" />
        <span>מקרא יומן:</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex size-4.5 items-center justify-center rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Needle size={11} />
          </div>
          <span className="font-medium">סשן קעקוע</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex size-4.5 items-center justify-center rounded border border-dashed border-accent-ink/70 bg-accent-ink/10 text-accent-ink shrink-0">
            <PencilLine size={10} />
          </div>
          <span className="font-medium">פגישת סקיצה (קו מקווקו)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning ring-1 ring-card shrink-0" />
          <span className="font-medium">ממתין לאישור</span>
        </div>

        <div className="flex items-center gap-1.5">
          <TriangleAlert size={12} className="text-warning shrink-0" />
          <span className="font-medium">מחוץ לשעות העבודה</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            style={BUSY_STRIPES_PREVIEW}
            className="size-3.5 rounded border border-border bg-muted/60 shrink-0"
          />
          <span className="font-medium">חסימת יומן חיצוני (Google)</span>
        </div>
      </div>
    </div>
  )
}

export default CalendarLegend

