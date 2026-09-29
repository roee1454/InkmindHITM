import { cn } from '@/lib/utils'
import { ArtistBadge } from '@/features/calendar/components/ArtistBadge'
import { MARKER_DOT, MARKER_LABELS, appointmentVisual } from '@/features/calendar/utils/appointment-visual'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import { formatShortSlot } from '@/features/projects/utils/format'
import type { ApiAppointment } from '@/features/calendar/types'
import { HomeEmpty, HomeRow, HomeRowsSkeleton, HomeSection } from './HomeSection'

interface TodayCardProps {
  appointments: ApiAppointment[]
  next: ApiAppointment | null
  isLoading: boolean
  now: Date
  onOpen: (appointment: ApiAppointment) => void
}

/**
 * Today's chair, by the hour, in the calendar's vocabulary: the kind ("סשן 2"), the artist, and
 * the one marker a person should act on (awaiting approval / awaiting close-out). Past and settled
 * appointments recede instead of disappearing, so the day still reads as a whole.
 */
export function TodayCard({ appointments, next, isLoading, now, onOpen }: TodayCardProps) {
  return (
    <HomeSection title="היום" count={appointments.length}>
      {isLoading ? (
        <HomeRowsSkeleton rows={3} />
      ) : appointments.length === 0 ? (
        <HomeEmpty
          title="אין תורים היום"
          hint={next ? `התור הבא: ${formatShortSlot(`${next.date}T${next.timeSlot}`)} · ${next.leadName || 'לקוח ללא שם'}` : 'אין תורים קרובים ביומן.'}
        />
      ) : (
        appointments.map((appointment) => {
          const visual = appointmentVisual(appointment, now.getTime())
          const kind = appointmentKindLabel(appointment.kind, appointment.projectPosition)
          return (
            <HomeRow
              key={appointment.id}
              onClick={() => onOpen(appointment)}
              lead={
                <span className={cn('w-11 shrink-0 text-sm font-bold tabular-nums', visual.muted ? 'text-muted-foreground' : 'text-foreground')}>
                  {appointment.timeSlot}
                </span>
              }
              title={appointment.leadName || 'לקוח ללא שם'}
              detail={
                <span className="flex min-w-0 items-center gap-1.5">
                  <ArtistBadge staffId={appointment.staffId} staffName={appointment.staffName} size={16} />
                  <span className="truncate">{[kind, appointment.staffName].filter(Boolean).join(' · ')}</span>
                </span>
              }
              trail={
                visual.marker ? (
                  // On a phone the dot alone; the words where there's room.
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground" aria-label={MARKER_LABELS[visual.marker]}>
                    <span aria-hidden className={cn('size-2 rounded-full', MARKER_DOT[visual.marker])} />
                    <span className="hidden sm:inline">{MARKER_LABELS[visual.marker]}</span>
                  </span>
                ) : visual.muted ? (
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">{appointment.status === 'completed' ? 'הסתיים' : 'לא הגיע'}</span>
                ) : null
              }
            />
          )
        })
      )}
    </HomeSection>
  )
}
