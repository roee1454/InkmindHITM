type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

const APPOINTMENT_STATUS_TRANSLATIONS: Record<AppointmentStatus, { label: string; color: string }> = {
  pending: { label: 'ממתין לאישור', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  confirmed: { label: 'מאושר', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  completed: { label: 'הושלם', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  cancelled: { label: 'בוטל', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  no_show: { label: 'לא הגיע', color: 'bg-muted text-muted-foreground border-border' },
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
  return (
    <div className="flex h-[18rem] md:h-[22rem] lg:h-[30rem] flex-col rounded-2xl border border-border bg-card py-6">
      <div className="mb-6 flex items-center justify-between px-6">
        <h3 className="font-assistant text-xl font-bold text-foreground">תורים קרובים</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="cursor-pointer font-assistant text-xs font-bold text-primary hover:underline"
        >
          כל התורים
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {appointments.length > 0 ? (
          appointments.map((apt) => {
            const translation = APPOINTMENT_STATUS_TRANSLATIONS[apt.status]
            const dayNum = apt.date.split('-')[2] || apt.date

            return (
              <div
                key={apt.id}
                className="flex items-center justify-between border-b border-border/45 bg-transparent px-6 py-3 transition-colors last:border-b-0 hover:bg-muted/15"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center leading-tight">
                    <span className="font-assistant text-base font-black text-foreground">{dayNum}</span>
                    <span className="font-assistant text-micro text-muted-foreground">{apt.timeSlot}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-assistant text-sm font-bold text-foreground">
                      {apt.leadName || 'לקוח ללא שם'}
                    </div>
                    <div className="max-w-[60vw] md:max-w-[200px] truncate font-assistant text-mini text-muted-foreground/70 hidden md:block">
                      {apt.style || 'פנייה כללית'}
                    </div>
                  </div>
                </div>
                <span className={`inline-block shrink-0 border px-2 py-0.5 font-assistant text-micro font-bold ${translation.color}`}>
                  {translation.label}
                </span>
              </div>
            )
          })
        ) : (
          <div className="flex h-full items-center justify-center font-assistant text-sm text-muted-foreground">
            אין תורים קרובים ביומן
          </div>
        )}
      </div>
    </div>
  )
}
export default CloseAppointmentsCard
