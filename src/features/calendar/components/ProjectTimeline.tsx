import { Needle, PencilLine } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { ApiAppointment } from '../types'
import { appointmentKindLabel } from '../utils/project-position'
import { getAppointmentStatusVisual } from '../utils/appointment-status'

function shortDate(ymd: string): string {
  const [, month, day] = ymd.split('-')
  return `${Number(day)}.${Number(month)}`
}

/**
 * Every appointment of the same tattoo project — consultation, sessions, touch-ups — oldest first,
 * so staff see that a session is the follow-up of a consultation instead of a separate booking.
 */
export function ProjectTimeline({ appointments, currentId }: { appointments: ApiAppointment[]; currentId: string }) {
  if (appointments.length < 2) return null
  const ordered = [...appointments].sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`))

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-3" aria-label="שלבי הפרויקט">
      <h3 className="mb-2 text-xs font-extrabold text-foreground">שלבי הפרויקט</h3>
      <ol className="flex flex-col gap-1">
        {ordered.map((appointment) => {
          const visual = getAppointmentStatusVisual(appointment.status)
          const isCurrent = appointment.id === currentId
          return (
            <li
              key={appointment.id}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-xs',
                isCurrent && 'bg-primary/10 font-bold',
                visual.isCancelled && 'opacity-60',
              )}
            >
              <span className="flex items-center gap-1.5 text-foreground">
                {appointment.kind === 'consultation' ? (
                  <PencilLine size={12} className="shrink-0 text-accent-ink" />
                ) : (
                  <Needle size={12} className="shrink-0 text-primary" />
                )}
                {appointmentKindLabel(appointment.kind, appointment.projectPosition)}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {shortDate(appointment.date)} · {appointment.timeSlot}
              </span>
              <span className={cn('rounded-full px-2 py-0.5 text-micro font-bold', visual.badgeClass)}>{visual.label}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
