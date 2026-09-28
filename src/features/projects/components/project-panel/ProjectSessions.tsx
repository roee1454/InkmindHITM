import { CalendarPlus } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import { getAppointmentStatusVisual } from '@/features/calendar/utils/appointment-status'
import { formatIls } from '@/features/payments/utils/labels'
import { formatShortSlot } from '../../utils/format'
import type { PanelAppointment } from '../../utils/panel'
import type { ProjectDetails } from '../../types'
import { AttachMenu, MoveMenu } from './AppointmentMenus'

const ACTOR_LABELS: Record<string, string> = { customer: 'הלקוח', bot: 'הבוט', staff: 'הצוות', system: 'המערכת' }

function dotClass(appointment: PanelAppointment): string {
  if (appointment.isNext) return 'bg-foreground ring-4 ring-accent-soft'
  if (appointment.status === 'completed') return 'bg-status-done'
  if (appointment.status === 'cancelled' || appointment.status === 'no_show') return 'bg-muted-foreground/40'
  return 'border-2 border-foreground/50 bg-card'
}

function chargeText(appointment: PanelAppointment): string | null {
  if (appointment.chargeWaived) return 'ללא חיוב'
  return appointment.finalPrice !== null ? formatIls(appointment.finalPrice) : null
}

interface ProjectSessionsProps {
  appointments: PanelAppointment[]
  project: ProjectDetails
  isMoving: boolean
  onMove: (appointmentId: string, target: string) => void
  isAttaching: boolean
  onAttach: (appointmentId: string) => void
  onBook: () => void
}

/**
 * Every appointment in the piece on one rail, oldest first — a real sequence, so it reads as one:
 * a consultation, then numbered sessions. Price, the next-up marker and any reschedule sit on the
 * appointment they belong to.
 */
export function ProjectSessions({ appointments, project, isMoving, onMove, isAttaching, onAttach, onBook }: ProjectSessionsProps) {
  return (
    <section aria-labelledby="project-sessions" className="flex flex-col gap-3">
      <div className="flex min-h-9 items-center justify-between gap-2">
        <h3 id="project-sessions" className="text-sm font-extrabold text-foreground">
          תורים <span className="font-semibold text-muted-foreground">· {appointments.length}</span>
        </h3>
        {project.canManage && (
          <div className="flex items-center gap-1">
            {project.attachable.length > 0 && <AttachMenu appointments={project.attachable} disabled={isAttaching} onAttach={onAttach} />}
            <Button type="button" variant="outline" size="sm" onClick={onBook} className="h-8 gap-1.5 px-2.5">
              <CalendarPlus size={15} />
              קביעת תור
            </Button>
          </div>
        )}
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          עדיין אין תורים בפרויקט הזה.
          {project.canManage && (project.attachable.length > 0 ? ' קבעו תור חדש, או שייכו לכאן תור קיים של הלקוח.' : ' קבעו את התור הראשון.')}
        </p>
      ) : (
        <ol className="flex flex-col">
          {appointments.map((appointment, index) => {
            const visual = getAppointmentStatusVisual(appointment.status)
            const charge = chargeText(appointment)
            const last = index === appointments.length - 1
            return (
              <li key={appointment.id} className={cn('relative flex gap-3', !last && 'pb-4')}>
                {!last && <span aria-hidden className="absolute top-4 bottom-0 start-[5px] w-px bg-border" />}
                <span aria-hidden className={cn('relative mt-1.5 size-[11px] shrink-0 rounded-full', dotClass(appointment))} />

                <div className={cn('flex min-w-0 flex-1 items-start justify-between gap-3', visual.isCancelled && 'opacity-60')}>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-bold text-foreground">{appointmentKindLabel(appointment.kind, appointment.projectPosition)}</span>
                    <span className={cn('text-xs tabular-nums', appointment.isNext ? 'font-bold text-foreground' : 'text-muted-foreground')}>
                      {appointment.isNext && 'הבא · '}
                      {formatShortSlot(appointment.start)}
                      {charge && ` · ${charge}`}
                    </span>
                    {appointment.movedFrom && (
                      <span className="text-2xs text-muted-foreground">
                        נדחה מ-{formatShortSlot(appointment.movedFrom.start)}
                        {ACTOR_LABELS[appointment.movedFrom.actor] ? ` · ע״י ${ACTOR_LABELS[appointment.movedFrom.actor]}` : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', visual.badgeClass)}>{visual.label}</span>
                    {project.canManage && (
                      <MoveMenu appointment={appointment} otherProjects={project.otherProjects} disabled={isMoving} onMove={(target) => onMove(appointment.id, target)} />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
