import React from 'react'
import { PencilLine, Needle, TriangleAlert } from '@/components/ui/icon'
import type { ApiAppointment } from '../types'
import { artistColor } from '../utils/artist-colors'
import { buildAppointmentTooltip, getAppointmentStatusVisual } from '../utils/appointment-status'
import { cn } from '@/lib/utils'

interface AppointmentMonthChipProps {
  appointment: ApiAppointment
  artistAvatars?: Record<string, string>
  onSelect: () => void
}

export const AppointmentMonthChip: React.FC<AppointmentMonthChipProps> = ({
  appointment,
  onSelect,
}) => {
  const isSketch = appointment.type === 'sketch'
  const visual = getAppointmentStatusVisual(appointment.status)
  const artist = artistColor(appointment.staffId)
  const tooltipText = buildAppointmentTooltip(appointment)
  const clientName = appointment.leadName || 'ללא שם'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      title={tooltipText}
      className={cn(
        'group/item relative flex h-[23px] w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-1.5 text-right text-mini leading-tight select-none transition-all duration-100 hover:shadow-2xs hover:scale-[1.01] active:scale-[0.99] cursor-pointer',
        isSketch
          ? 'border-dashed border-accent-ink/60 bg-accent-ink/[0.06] hover:bg-accent-ink/[0.12] text-accent-ink'
          : 'border-border/70 bg-card hover:bg-muted/50 hover:border-border text-foreground',
        visual.isCancelled && 'opacity-45 grayscale line-through',
      )}
    >
      {/* Artist Identity Dot */}
      <span
        className={cn('size-1.5 shrink-0 rounded-full', artist.dot)}
        title={appointment.staffName ? `מקעקע: ${appointment.staffName}` : 'ללא שיוך מקעקע'}
      />

      {/* Exception Alert */}
      {appointment.isException && (
        <TriangleAlert size={9} className="shrink-0 text-warning" />
      )}

      {/* Type Icon (Pencil for sketch, Needle for tattoo) */}
      {isSketch ? (
        <PencilLine size={9} className="shrink-0 text-accent-ink hidden @[70px]:inline-block" />
      ) : (
        <Needle size={9} className="shrink-0 text-primary hidden @[70px]:inline-block" />
      )}

      {/* Time & Client Name in 1 uncluttered flow */}
      <div className="flex flex-1 min-w-0 items-center gap-1 overflow-hidden">
        <span className="shrink-0 text-micro font-bold tabular-nums text-foreground/90">
          {appointment.timeSlot}
        </span>
        <span className="hidden @[60px]:inline text-muted-foreground/40 select-none">·</span>
        <span className="truncate font-semibold text-micro text-foreground/95">
          {clientName}
        </span>
      </div>

      {/* Pending status dot */}
      {visual.isPending && (
        <span
          className="size-1.5 rounded-full bg-status-wait shrink-0 ms-auto animate-pulse"
          title="ממתין לאישור"
        />
      )}
    </button>
  )
}

