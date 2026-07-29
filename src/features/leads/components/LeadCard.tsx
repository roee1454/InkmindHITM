import { Lock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatLeadDate } from '../lib/format'
import { SOURCE_LABELS } from '../types'
import type { UILead } from '../types'

interface LeadCardProps {
  lead: UILead
  editable: boolean
  artistName: string
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpenChat: () => void
}

export function LeadCard({
  lead,
  editable,
  artistName,
  isDragging,
  onDragStart,
  onDragEnd,
  onOpenChat,
}: LeadCardProps) {
  return (
    <div
      draggable={editable}
      onDragStart={editable ? onDragStart : undefined}
      onDragEnd={editable ? onDragEnd : undefined}
      title={editable ? undefined : 'הליד הזה משויך לאיש צוות אחר — אין הרשאת עריכה'}
      className={`lead-card group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all ${
        editable ? 'cursor-grab hover:border-primary/50 hover:shadow-md active:cursor-grabbing' : 'cursor-not-allowed opacity-70'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {(lead.source && SOURCE_LABELS[lead.source]) || lead.source || 'מקור לא ידוע'}
        </span>
        {!editable ? <Lock className="size-3.5 text-muted-foreground" /> : null}
      </div>

      <h4 className="mt-2 font-assistant text-sm font-bold text-foreground">
        {lead.name || lead.phone}
      </h4>

      <p className="mt-1 text-xs text-muted-foreground">מקעקע: {artistName}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="text-[10px] text-muted-foreground">{formatLeadDate(lead.updatedAt)}</span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!lead.conversationId}
          onClick={onOpenChat}
        >
          פתח שיחה
        </Button>
      </div>
    </div>
  )
}
