import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { CalendarClock, ShieldAlert } from '@/components/ui/icon'
import { blockerMessage, formatAppointmentSlot } from '../utils/delete-messages'
import type { DeleteBlocker } from '../types'

/** Explains why the delete can't happen yet and, where there is one, the way forward. */
export function DeleteBlockerNotice({ blocker }: { blocker: DeleteBlocker }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3.5">
      <div className="flex items-start gap-2.5 text-xs text-foreground">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-warning" />
        <p className="leading-relaxed">{blockerMessage(blocker)}</p>
      </div>

      {blocker.code === 'active_appointments' && (
        <>
          <ul className="flex flex-col gap-1.5 rounded-lg bg-background/60 p-2.5">
            {blocker.appointments.map((appointment) => (
              <li key={appointment.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  <CalendarClock size={14} className="shrink-0 text-warning" />
                  {formatAppointmentSlot(appointment.startTime)}
                </span>
                <span className="text-muted-foreground">
                  {appointment.staffName ?? 'ללא אמן'} · {appointment.status === 'pending' ? 'ממתין' : 'מאושר'}
                </span>
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link to="/dashboard/calendar">מעבר ליומן לביטול התורים</Link>
          </Button>
        </>
      )}
    </div>
  )
}
