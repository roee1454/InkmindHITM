import { EllipsisVertical, Lock, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatLeadDate } from '../lib/format'
import { COLUMNS, SOURCE_LABELS } from '../types'
import type { LeadStage, UILead } from '../types'

interface LeadCardProps {
  lead: UILead
  editable: boolean
  artistName: string
  isDragging: boolean
  /** Touch/pen primary input — HTML5 drag doesn't fire there, so it's disabled entirely. */
  isCoarsePointer: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpenChat: () => void
  /** Touch replacement for drag-and-drop; wired to the same optimistic mutation. */
  onMoveToStage: (stage: LeadStage) => void
}

export function LeadCard({
  lead,
  editable,
  artistName,
  isDragging,
  isCoarsePointer,
  onDragStart,
  onDragEnd,
  onOpenChat,
  onMoveToStage,
}: LeadCardProps) {
  // HTML5 drag events never fire on touch devices, and leaving `draggable` on makes iOS
  // long-press produce a ghost drag image that goes nowhere.
  const canDrag = editable && !isCoarsePointer

  return (
    <div
      draggable={canDrag}
      onDragStart={
        canDrag
          ? (e) => {
              // A device can be under `lg` (so the ⋮ menu shows) while still reporting a fine
              // pointer (narrow desktop window, touch laptop) — there the card is draggable and
              // the browser's native drag would otherwise swallow the press on the menu.
              if ((e.target as HTMLElement).closest('[data-slot="dropdown-menu-trigger"]')) {
                e.preventDefault()
                return
              }
              onDragStart()
            }
          : undefined
      }
      onDragEnd={canDrag ? onDragEnd : undefined}
      title={editable ? undefined : 'הליד הזה משויך לאיש צוות אחר — אין הרשאת עריכה'}
      className={`lead-card group relative rounded-xl border border-border bg-card p-4 shadow-sm transition-all ${
        editable
          ? 'hover:border-primary/50 hover:shadow-md lg:cursor-grab lg:active:cursor-grabbing'
          : 'cursor-not-allowed opacity-70'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          {(lead.source && SOURCE_LABELS[lead.source]) || lead.source || 'מקור לא ידוע'}
        </span>
        <div className="flex items-center gap-1">
          {!editable ? <Lock className="size-3.5 text-muted-foreground" /> : null}
          {editable && (
            // Drag is desktop-only, so touch gets an explicit stage picker instead.
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="העברה לשלב אחר"
                  draggable={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="-me-1 lg:hidden"
                >
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="font-assistant">
                <DropdownMenuLabel className="text-xs">העברה לשלב</DropdownMenuLabel>
                {COLUMNS.filter((c) => c.stage !== lead.stage).map((c) => (
                  <DropdownMenuItem
                    key={c.stage}
                    onSelect={() => onMoveToStage(c.stage)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <h4 className="mt-2 font-assistant text-sm font-bold text-foreground">
        {lead.name || lead.phone}
      </h4>

      <p className="mt-1 text-xs text-muted-foreground">מקעקע: {artistName}</p>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="text-micro text-muted-foreground">{formatLeadDate(lead.updatedAt)}</span>
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
