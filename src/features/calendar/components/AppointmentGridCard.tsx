import React from 'react'
import { Needle, PencilLine } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { artistColor } from '../utils/artist-colors'
import { appointmentVisual, MARKER_DOT, MARKER_LABELS } from '../utils/appointment-visual'
import { buildAppointmentTooltip, formatAppointmentTimeRange } from '../utils/appointment-status'
import type { ApiAppointment } from '../types'

/** Below this the block only has room for one line. */
const COMPACT_HEIGHT = 56

interface AppointmentGridCardProps {
  appointment: ApiAppointment
  top: number
  height: number
  column: number
  columnCount: number
  widthPercent: number
  onSelect: () => void
  isOverflowSlot?: boolean
  overflowCount?: number
  onOverflowClick?: () => void
}

/**
 * One appointment in the time grid (track-b B6.8). It carries the customer's name, the time, and
 * nothing else: the artist is the block's colour, the kind is one icon, and a single dot flags the
 * one thing needing action. Price, deposit, health declaration and style live in the tooltip, the
 * day overview and the edit dialog — seven competing badges in a 56px block was the old design's
 * whole problem.
 */
export const AppointmentGridCard: React.FC<AppointmentGridCardProps> = ({
  appointment,
  top,
  height,
  column,
  columnCount,
  widthPercent,
  onSelect,
  isOverflowSlot = false,
  overflowCount = 0,
  onOverflowClick,
}) => {
  const isSketch = appointment.type === 'sketch'
  const artist = artistColor(appointment.staffId)
  const visual = appointmentVisual(appointment, Date.now())
  const isCompact = height < COMPACT_HEIGHT
  const KindIcon = isSketch ? PencilLine : Needle

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top, height: Math.max(height, 22), insetInlineEnd: `${column * widthPercent}%`, width: `${widthPercent}%` }}
      className="absolute z-10 p-0.5"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        title={buildAppointmentTooltip(appointment)}
        className={cn(
          'group/card relative h-full w-full select-none overflow-hidden rounded-lg border px-1.5 py-1 text-right transition-colors duration-150 cursor-pointer',
          artist.surface,
          'hover:border-accent-ink/50',
          visual.dashed && 'border-dashed',
          visual.muted && 'opacity-55',
          visual.struck && 'line-through',
        )}
      >
        <div className={cn('flex h-full min-w-0 gap-1.5', isCompact ? 'items-center' : 'flex-col justify-start')}>
          <div className="flex min-w-0 items-center gap-1">
            <KindIcon size={11} className="shrink-0 text-muted-foreground" />
            <span className="truncate text-xs font-extrabold text-foreground">
              {appointment.leadName || 'לקוח ללא שם'}
            </span>
            {visual.marker && (
              <span
                title={MARKER_LABELS[visual.marker]}
                className={cn('size-1.5 shrink-0 rounded-full', MARKER_DOT[visual.marker])}
              />
            )}
          </div>

          {/* `dir=ltr`: a bidi-neutral dash between two LTR clocks renders the range backwards
              in an RTL page ("14:00 – 11:00" for an 11:00 appointment). */}
          <span dir="ltr" className="shrink-0 truncate text-2xs font-semibold tabular-nums text-muted-foreground">
            {isCompact
              ? appointment.timeSlot
              : formatAppointmentTimeRange(appointment.timeSlot, appointment.durationMinutes || 120)}
          </span>
        </div>

        {isOverflowSlot && onOverflowClick && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onOverflowClick()
            }}
            className="absolute inset-x-0 bottom-0 cursor-pointer bg-primary py-0.5 text-center text-2xs font-extrabold text-primary-foreground"
          >
            +{overflowCount || columnCount - 2}
          </span>
        )}
      </button>
    </div>
  )
}
