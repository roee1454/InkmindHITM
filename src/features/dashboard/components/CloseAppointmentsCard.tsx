import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'

type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

const APPOINTMENT_STATUS_TRANSLATIONS: Record<AppointmentStatus, { label: string; pill: string }> = {
  pending: { label: 'ממתין לאישור', pill: 'bg-warning/12 text-warning' },
  confirmed: { label: 'מאושר', pill: 'bg-success/12 text-success' },
  completed: { label: 'הושלם', pill: 'bg-primary/10 text-primary' },
  cancelled: { label: 'בוטל', pill: 'bg-destructive/10 text-destructive' },
  no_show: { label: 'לא הגיע', pill: 'bg-muted text-muted-foreground' },
}

interface CloseAppointmentsCardProps {
  appointments: Array<{
    id: string
    date: string
    timeSlot: string
    status: AppointmentStatus
    leadName: string | null
    style: string | null
  }>
  onViewAll: () => void
}

export function CloseAppointmentsCard({ appointments, onViewAll }: CloseAppointmentsCardProps) {
  const navigate = useNavigate()
  const visibleAppointments = appointments.slice(0, 4)

  return (
    <div className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-2xs sm:rounded-3xl">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-extrabold text-foreground">תורים קרובים</h3>
          {appointments.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
              {appointments.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="flex cursor-pointer items-center gap-0.5 text-xs font-bold text-primary transition-colors hover:underline"
        >
          <span>הכל</span>
          <ChevronLeft size={14} />
        </button>
      </div>

      {visibleAppointments.length > 0 ? (
        <div className="divide-y divide-border/60">
          {visibleAppointments.map((apt) => {
            const translation = APPOINTMENT_STATUS_TRANSLATIONS[apt.status] ?? {
              label: apt.status,
              pill: 'bg-muted text-muted-foreground',
            }
            const dayNum = apt.date.split('-')[2] || apt.date

            return (
              <div
                key={apt.id}
                onClick={() => navigate({ to: '/dashboard/calendar' })}
                className="flex cursor-pointer select-none items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted sm:px-6"
              >
                <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/60 leading-none tabular-nums">
                  <span className="text-[13px] font-extrabold text-foreground">{dayNum}</span>
                  <span className="mt-0.5 text-[10px] font-bold text-muted-foreground">{apt.timeSlot}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-extrabold text-foreground">
                    {apt.leadName || 'לקוח ללא שם'}
                  </div>
                  <div className="truncate text-xs font-medium text-muted-foreground">
                    {apt.style || 'פנייה כללית'}
                  </div>
                </div>
                <span className={`pill shrink-0 ${translation.pill}`}>{translation.label}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center text-sm font-semibold text-muted-foreground">
          אין תורים קרובים ביומן
        </div>
      )}
    </div>
  )
}
export default CloseAppointmentsCard
