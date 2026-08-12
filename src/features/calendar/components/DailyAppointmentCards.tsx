import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { ApiAppointment } from '../types'
import { Plus, Trash2 } from 'lucide-react'
import { formatDuration, formatPriceRange } from '@/features/conversations/lib/format'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { useLongPress } from '../use-long-press'

interface DailyAppointmentCardsProps {
  appointments: ApiAppointment[]
  onSelectAppointment: (appointment: ApiAppointment) => void
  onNewAppointment: () => void
  onDeleteAppointment: (id: string) => void
}

export function DailyAppointmentCards({
  appointments,
  onSelectAppointment,
  onNewAppointment,
  onDeleteAppointment,
}: DailyAppointmentCardsProps) {
  const [deleteTarget, setDeleteTarget] = useState<ApiAppointment | null>(null)

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
      {appointments.map((appt) => (
        <AppointmentRow
          key={appt.id}
          appt={appt}
          onSelect={() => onSelectAppointment(appt)}
          onLongPress={() => setDeleteTarget(appt)}
        />
      ))}

      <ResponsiveDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="מחיקת תור"
        description={
          deleteTarget
            ? `התור של ${deleteTarget.leadName || 'הלקוח'} בשעה ${deleteTarget.timeSlot} יימחק לצמיתות. לא ניתן לבטל פעולה זו.`
            : undefined
        }
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              if (deleteTarget) onDeleteAppointment(deleteTarget.id)
              setDeleteTarget(null)
            }}
            className="btn-native bg-destructive text-destructive-foreground"
          >
            <Trash2 size={16} />
            מחיקת תור
          </button>
          <button type="button" onClick={() => setDeleteTarget(null)} className="btn-native-ghost">
            ביטול
          </button>
        </div>
      </ResponsiveDialog>
    </div>
  )
}

interface AppointmentRowProps {
  appt: ApiAppointment
  onSelect: () => void
  onLongPress: () => void
}

/** Tap opens the appointment for editing; long-press opens the delete confirmation instead —
 *  split into its own component so `useLongPress` (which holds refs) is called once per list
 *  item, not inside the parent's `.map()` loop. */
function AppointmentRow({ appt, onSelect, onLongPress }: AppointmentRowProps) {
  const longPress = useLongPress(onLongPress, onSelect)

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
    ? 'bg-success/12 text-success'
    : isPending
      ? 'bg-warning/12 text-warning'
      : isCompleted
        ? 'bg-primary/10 text-primary'
        : 'bg-muted text-muted-foreground'

  const borderSideClass = isConfirmed
    ? 'border-s-4 border-s-success'
    : isPending
      ? 'border-s-4 border-s-warning'
      : isCompleted
        ? 'border-s-4 border-s-primary'
        : 'border-s-4 border-s-muted-foreground/40'

  const durationText = appt.durationMinutes ? formatDuration(appt.durationMinutes) : null

  const priceText =
    appt.priceMax === 0
      ? 'ללא עלות (ייעוץ)'
      : appt.priceMin === null && appt.priceMax === null
        ? 'מחיר טרם נקבע'
        : appt.hasDeposit
          ? `${formatPriceRange(appt.priceMin, appt.priceMax)} · מקדמה ₪${(appt.depositAmount || 0).toLocaleString()} שולמה ✓`
          : `${formatPriceRange(appt.priceMin, appt.priceMax)} · ללא מקדמה`

  return (
    <div className="flex items-start gap-3">
      {/* Time Slot Column */}
      <div className="w-[52px] shrink-0 pt-3.5 text-center">
        <span className="font-mono text-[13px] font-extrabold text-muted-foreground tabular-nums">
          {appt.timeSlot}
        </span>
      </div>

      {/* Appointment Card — tap to edit, long-press to delete */}
      <div
        {...longPress}
        className={cn(
          'flex-1 cursor-pointer select-none touch-manipulation rounded-[18px] border border-border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 active:scale-[0.99] flex flex-col gap-1.5',
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
          {appt.style || 'קעקוע כללי'}
          {durationText ? ` • ${durationText}` : ''}
        </span>

        {/* Bottom: Price Range & Deposit Status */}
        <span
          className={cn(
            'text-[13.5px] font-bold truncate',
            appt.priceMax === 0 ? 'text-muted-foreground' : 'text-foreground',
          )}
        >
          {priceText}
        </span>
      </div>
    </div>
  )
}
