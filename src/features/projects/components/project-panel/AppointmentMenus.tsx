import { EllipsisVertical, Link } from '@/components/ui/icon'
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
import { PROJECT_STAGE_LABELS } from '../../utils/labels'
import { formatShortSlot } from '../../utils/format'
import type { PanelAppointment } from '../../utils/panel'
import type { ProjectDetails } from '../../types'

interface MoveMenuProps {
  appointment: PanelAppointment
  otherProjects: ProjectDetails['otherProjects']
  disabled: boolean
  onMove: (target: string) => void
}

/** Fixing an appointment filed under the wrong piece lives on the appointment itself, not in a form of its own. */
export function MoveMenu({ appointment, otherProjects, disabled, onMove }: MoveMenuProps) {
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

interface AttachMenuProps {
  appointments: ProjectDetails['attachable']
  disabled: boolean
  onAttach: (appointmentId: string) => void
}

/**
 * The customer's appointments filed under their other pieces, to bring one into this project —
 * e.g. a session the bot booked under a fresh inquiry instead of the sleeve it belongs to.
 */
export function AttachMenu({ appointments, disabled, onAttach }: AttachMenuProps) {
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger
        disabled={disabled}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <Link size={15} />
        שיוך תור
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 min-w-64 overflow-y-auto font-assistant">
        <DropdownMenuLabel className="text-xs text-muted-foreground">תורים של הלקוח בפרויקטים אחרים</DropdownMenuLabel>
        {appointments.map((appointment) => {
          const visual = getAppointmentStatusVisual(appointment.status)
          return (
            <DropdownMenuItem key={appointment.id} onSelect={() => onAttach(appointment.id)} className={cn('flex-col items-start gap-0.5', visual.isCancelled && 'opacity-60')}>
              <span className="flex w-full items-center gap-2">
                <span className="font-bold">{appointmentKindLabel(appointment.kind, null)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{formatShortSlot(`${appointment.date}T${appointment.timeSlot}:00`)}</span>
                <span className={cn('ms-auto rounded-full px-2 py-0.5 text-2xs font-bold', visual.badgeClass)}>{visual.label}</span>
              </span>
              <span className="text-2xs text-muted-foreground">מתוך: {appointment.projectTitle}</span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
