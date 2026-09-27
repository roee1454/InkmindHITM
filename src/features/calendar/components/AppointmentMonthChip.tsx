import React from 'react'
import { Needle, PencilLine } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { artistColor } from '../utils/artist-colors'
import { appointmentVisual, MARKER_DOT, MARKER_LABELS } from '../utils/appointment-visual'
import { buildAppointmentTooltip } from '../utils/appointment-status'
import type { ApiAppointment } from '../types'

interface AppointmentMonthChipProps {
  appointment: ApiAppointment
  onSelect: () => void
}

/** One appointment in a month cell: time, name, and the same four visual channels as the grid. */
export const AppointmentMonthChip: React.FC<AppointmentMonthChipProps> = ({ appointment, onSelect }) => {
  const visual = appointmentVisual(appointment, Date.now())
  const artist = artistColor(appointment.staffId)
  const KindIcon = appointment.type === 'sketch' ? PencilLine : Needle

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      title={buildAppointmentTooltip(appointment)}
      className={cn(
        'flex h-[22px] w-full min-w-0 cursor-pointer select-none items-center gap-1 overflow-hidden rounded-md border px-1.5 text-right transition-colors duration-150',
        artist.surface,
        'hover:border-accent-ink/50',
        visual.dashed && 'border-dashed',
        visual.muted && 'opacity-55',
        visual.struck && 'line-through',
      )}
    >
      <KindIcon size={10} className="hidden shrink-0 text-muted-foreground @[70px]:inline-block" />
      <span className="shrink-0 text-2xs font-bold tabular-nums text-foreground">{appointment.timeSlot}</span>
      <span className="truncate text-2xs font-semibold text-foreground">{appointment.leadName || 'ללא שם'}</span>
      {visual.marker && (
        <span
          title={MARKER_LABELS[visual.marker]}
          className={cn('ms-auto size-1.5 shrink-0 rounded-full', MARKER_DOT[visual.marker])}
        />
      )}
    </button>
  )
}
