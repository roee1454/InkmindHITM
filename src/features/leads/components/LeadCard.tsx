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
              // Center the drag image on the cursor regardless of where on the card it was
              // grabbed — the browser's default drag image otherwise offsets from the grab point.
              const card = e.currentTarget
              const rect = card.getBoundingClientRect()
              e.dataTransfer.setDragImage(card, rect.width / 2, rect.height / 2)
              onDragStart()
            }
          : undefined
      }
      onDragEnd={canDrag ? onDragEnd : undefined}
      title={editable ? undefined : 'הליד הזה משויך לאיש צוות אחר — אין הרשאת עריכה'}
      className={`lead-card group relative flex flex-col gap-2.5 rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all duration-150 ease-native ${
        editable ? 'lg:cursor-grab lg:active:cursor-grabbing' : 'cursor-not-allowed opacity-65'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground">
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
                  size="icon"
                  aria-label="העברה לשלב אחר"
                  draggable={false}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="-me-2 -my-1 size-8 lg:hidden"
                >
                  <EllipsisVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="font-assistant">
                <DropdownMenuLabel>העברה לשלב</DropdownMenuLabel>
                {COLUMNS.filter((c) => c.stage !== lead.stage).map((c) => (
                  <DropdownMenuItem key={c.stage} onSelect={() => onMoveToStage(c.stage)}>
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <h4 className="font-assistant text-[16px] font-extrabold text-foreground">
        {lead.name || lead.phone}
      </h4>

      <p className="text-[13px] text-muted-foreground">מקעקע: {artistName}</p>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5">
        <span className="text-[12.5px] text-muted-foreground">{formatLeadDate(lead.updatedAt)}</span>
        <button
          type="button"
          disabled={!lead.conversationId}
          onClick={onOpenChat}
          className="cursor-pointer text-[13.5px] font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          פתח שיחה
        </button>
      </div>
    </div>
  )
}
