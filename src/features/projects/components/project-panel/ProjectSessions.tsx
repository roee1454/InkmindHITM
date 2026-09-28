import { EllipsisVertical } from '@/components/ui/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import { getAppointmentStatusVisual } from '@/features/calendar/utils/appointment-status'
import { formatIls } from '@/features/payments/utils/labels'
import { PROJECT_STAGE_LABELS } from '../../utils/labels'
import { formatShortSlot } from '../../utils/format'
import type { PanelAppointment } from '../../utils/panel'
import type { ProjectDetails } from '../../types'

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

interface MoveMenuProps {
  appointment: PanelAppointment
  otherProjects: ProjectDetails['otherProjects']
  disabled: boolean
  onMove: (target: string) => void
}

/** Fixing an appointment filed under the wrong piece lives on the appointment itself, not in a form of its own. */
function MoveMenu({ appointment, otherProjects, disabled, onMove }: MoveMenuProps) {
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={`פעולות ל${appointmentKindLabel(appointment.kind, appointment.projectPosition)}`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <EllipsisVertical size={16} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 font-assistant">
        <DropdownMenuLabel className="text-xs text-muted-foreground">העברה לפרויקט אחר</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onMove('new')}>פרויקט חדש</DropdownMenuItem>
        {otherProjects.length > 0 && <DropdownMenuSeparator />}
        {otherProjects.map((project) => (
          <DropdownMenuItem key={project.id} onSelect={() => onMove(project.id)}>
            <span className="truncate">{project.title}</span>
            <span className="ms-auto text-2xs text-muted-foreground">{PROJECT_STAGE_LABELS[project.stage]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface ProjectSessionsProps {
  appointments: PanelAppointment[]
  project: ProjectDetails
  isMoving: boolean
  onMove: (appointmentId: string, target: string) => void
}

/**
 * Every appointment in the piece on one rail, oldest first — a real sequence, so it reads as one:
 * a consultation, then numbered sessions. Price, the next-up marker and any reschedule sit on the
 * appointment they belong to.
 */
export function ProjectSessions({ appointments, project, isMoving, onMove }: ProjectSessionsProps) {
  return (
    <section aria-labelledby="project-sessions" className="flex flex-col gap-3">
      <h3 id="project-sessions" className="text-sm font-extrabold text-foreground">
        תורים <span className="font-semibold text-muted-foreground">· {appointments.length}</span>
      </h3>

      {appointments.length === 0 ? (
        <p className="text-sm text-muted-foreground">עדיין אין תורים בפרויקט הזה. תור שנקבע ללקוח ומשויך לפרויקט יופיע כאן.</p>
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
