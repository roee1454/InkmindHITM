import { cn } from '@/lib/utils'
import type { ApiAppointment } from '../types'
import { Plus } from 'lucide-react'

interface DailyAppointmentCardsProps {
  appointments: ApiAppointment[]
  onSelectAppointment: (appointment: ApiAppointment) => void
  onNewAppointment: () => void
}

export function DailyAppointmentCards({
  appointments,
  onSelectAppointment,
  onNewAppointment,
}: DailyAppointmentCardsProps) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-[22px] border border-border">
        <span className="text-sm font-bold text-muted-foreground">
          אין תורים ליום זה
        </span>
        <button
          type="button"
          onClick={onNewAppointment}
          className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-extrabold text-primary hover:bg-primary/20 cursor-pointer"
        >
          <Plus size={15} />
          <span>קבע תור חדש</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 font-assistant">
      {appointments.map((appt) => {
        const isConfirmed = appt.status === 'confirmed'
        const isPending = appt.status === 'pending'
        const isCompleted = appt.status === 'completed'
        const isCancelled = appt.status === 'cancelled'

        const statusLabel = isConfirmed
          ? 'מאושר'
          : isPending
            ? 'ממתין לאישור'
            : isCompleted
              ? 'הושלם'
              : isCancelled
                ? 'בוטל'
                : 'לא הגיע'

        const statusBadgeClass = isConfirmed
          ? 'bg-emerald-500/10 text-emerald-600'
          : isPending
            ? 'bg-amber-500/10 text-amber-600'
            : isCompleted
              ? 'bg-blue-500/10 text-blue-600'
              : 'bg-muted text-muted-foreground'

        const borderSideClass = isConfirmed
          ? 'border-s-4 border-s-emerald-500'
          : isPending
            ? 'border-s-4 border-s-amber-500'
            : isCompleted
              ? 'border-s-4 border-s-blue-500'
              : 'border-s-4 border-s-muted-foreground/40'

        // Calculate price range representation
        const priceMin = appt.price ? Math.round(appt.price * 0.9) : 1600
        const priceMax = appt.price ? appt.price : 2000
        const durationText = appt.durationHours
          ? `${appt.durationHours} שעות`
          : '2–3 שעות'

        const priceText =
          appt.price === 0
            ? 'ללא עלות (ייעוץ)'
            : appt.hasDeposit
              ? `טווח: ₪${priceMin.toLocaleString()}–${priceMax.toLocaleString()} · מקדמה ₪${(appt.depositAmount || 350).toLocaleString()} שולמה ✓`
              : `טווח: ₪${priceMin.toLocaleString()}–${priceMax.toLocaleString()} · ללא מקדמה`

        return (
          <div key={appt.id} className="flex items-start gap-3">
            {/* Time Slot Column */}
            <div className="w-[52px] shrink-0 pt-3.5 text-center">
              <span className="font-mono text-[13px] font-extrabold text-muted-foreground tabular-nums">
                {appt.timeSlot}
              </span>
            </div>

            {/* Appointment Card */}
            <div
              onClick={() => onSelectAppointment(appt)}
              className={cn(
                'flex-1 cursor-pointer rounded-[18px] border border-border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 active:scale-[0.99] flex flex-col gap-1.5',
                borderSideClass,
              )}
            >
              {/* Header: Name and Status Badge */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15.5px] font-extrabold text-foreground truncate">
                  {appt.leadName || 'לקוח ללא שם'}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11.5px] font-bold shrink-0',
                    statusBadgeClass,
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              {/* Middle: Style/Placement & Duration */}
              <span className="text-[13.5px] font-medium text-muted-foreground truncate">
                {appt.style || 'קעקוע כללי'} • {durationText}
              </span>

              {/* Bottom: Price Range & Deposit Status */}
              <span
                className={cn(
                  'text-[13.5px] font-bold truncate',
                  appt.price === 0
                    ? 'text-muted-foreground'
                    : 'text-foreground',
                )}
              >
                {priceText}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
