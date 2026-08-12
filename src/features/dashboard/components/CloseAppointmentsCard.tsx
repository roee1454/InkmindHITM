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
  const visibleAppointments = appointments.slice(0, 4)

  return (
    <div className="card-native flex flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
        <h3 className="text-[16.5px] font-extrabold text-foreground">תורים קרובים</h3>
        <button type="button" onClick={onViewAll} className="cursor-pointer text-[13.5px] font-bold text-primary">
          הכל
        </button>
      </div>

      {visibleAppointments.length > 0 ? (
        visibleAppointments.map((apt) => {
          const translation = APPOINTMENT_STATUS_TRANSLATIONS[apt.status]
          const dayNum = apt.date.split('-')[2] || apt.date

          return (
            <div key={apt.id} className="row-native">
              <div className="flex w-9 shrink-0 flex-col items-center justify-center leading-tight tabular-nums">
                <span className="text-base font-extrabold text-foreground">{dayNum}</span>
                <span className="text-[11px] text-muted-foreground">{apt.timeSlot}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-foreground">{apt.leadName || 'לקוח ללא שם'}</div>
                <div className="truncate text-[13px] text-muted-foreground">{apt.style || 'פנייה כללית'}</div>
              </div>
              <span className={`pill shrink-0 ${translation.pill}`}>{translation.label}</span>
            </div>
          )
        })
      ) : (
        <div className="flex items-center justify-center px-5 py-8 text-sm text-muted-foreground">
          אין תורים קרובים ביומן
        </div>
      )}
    </div>
  )
}
export default CloseAppointmentsCard
