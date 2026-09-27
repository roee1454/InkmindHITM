import React, { useState } from 'react'
import { Plus } from '@/components/ui/icon'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import { HEBREW_DAYS_SHORT, buildMonthMatrix, isSameMonth, isToday, toYmd } from '../utils/date-utils'
import { DayOverviewDialog } from './DayOverviewDialog'
import { AppointmentMonthChip } from './AppointmentMonthChip'
import { cn } from '@/lib/utils'

const DEFAULT_SLOT = '12:00'
const MAX_VISIBLE = 3

const BUSY_STRIPES: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(148, 148, 148, 0.10) 6px, rgba(148, 148, 148, 0.10) 12px)',
}

interface MonthGridProps {
  anchorDate: Date
  appointments: ApiAppointment[]
  busyPeriods: ApiExternalBusyPeriod[]
  artistAvatars: Record<string, string>
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string) => void
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  anchorDate,
  appointments,
  busyPeriods,
  artistAvatars,
  onSelectAppointment,
  onSelectSlot,
}) => {
  const [dayOverviewDate, setDayOverviewDate] = useState<Date | null>(null)
  const weeks = buildMonthMatrix(anchorDate)

  const appointmentsForDay = (day: Date) =>
    appointments
      .filter((a) => a.date === toYmd(day))
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))

  const busyForDay = (day: Date) => busyPeriods.filter((b) => toYmd(new Date(b.startsAt)) === toYmd(day))

  const timeOf = (iso: string) => {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div dir="rtl" className="h-full overflow-y-auto font-assistant">
      <div className="sticky top-0 z-20 grid grid-cols-7 border-b border-border bg-card">
        {HEBREW_DAYS_SHORT.map((label) => (
          <div key={label} className="py-2.5 text-center text-2xs font-bold text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      {/* Rows share the leftover height so the month fills a full-bleed screen instead of
          leaving dead space under it, but never shrink below a readable cell. */}
      <div className="grid min-h-[calc(100%-2.5rem)] grid-cols-7 [grid-auto-rows:minmax(112px,1fr)]">
        {weeks.flat().map((day) => {
          const outside = !isSameMonth(day, anchorDate)
          const today = isToday(day)
          const dayAppointments = appointmentsForDay(day)
          const visibleAppointments = dayAppointments.slice(0, MAX_VISIBLE)
          const hiddenCount = dayAppointments.length - MAX_VISIBLE
          const dayBusy = busyForDay(day)

          return (
            <div
              key={toYmd(day)}
              className={cn(
                'group flex select-none flex-col justify-between border-b border-s border-border p-1.5 transition-colors @container',
                outside ? 'bg-muted/30' : 'bg-card/20',
                today && 'bg-accent-soft/40',
              )}
            >
              {/* Day cell header */}
              <div className="mb-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDayOverviewDate(day)}
                  className={cn(
                    'flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-mini font-bold transition-all cursor-pointer hover:ring-2 hover:ring-primary/40',
                    today
                      ? 'bg-primary text-primary-foreground font-extrabold shadow-xs'
                      : outside
                        ? 'text-muted-foreground/50 hover:text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                  )}
                  title={`צפה בכל הפגישות של ${day.getDate()}`}
                  aria-label={`צפה בכל הפגישות של ${day.getDate()}`}
                >
                  {day.getDate()}
                </button>

                {/* Explicit add appointment button (intentional, no accidental clicking) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectSlot(toYmd(day), DEFAULT_SLOT)
                  }}
                  className="size-5 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/15 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title={`קבע תור ל-${toYmd(day)}`}
                  aria-label={`קבע תור ל-${toYmd(day)}`}
                >
                  <Plus size={12} />
                </button>
              </div>

              {/* Appointments list (capped at MAX_VISIBLE) */}
              <div
                onClick={() => setDayOverviewDate(day)}
                className="flex-1 space-y-1 cursor-pointer min-w-0"
              >
                {dayBusy.map((busy) => (
                  <div
                    key={busy.googleEventId}
                    style={BUSY_STRIPES}
                    title={`חסימה: ${timeOf(busy.startsAt)}`}
                    className="pointer-events-none flex h-[22px] w-full min-w-0 items-center gap-1 overflow-hidden rounded-md border border-border bg-muted/40 px-1.5 text-right text-2xs text-muted-foreground"
                  >
                    <span className="shrink-0 font-semibold tabular-nums">{timeOf(busy.startsAt)}</span>
                    <span className="hidden @[70px]:inline truncate">חסימה</span>
                  </div>
                ))}

                {visibleAppointments.map((appointment) => (
                  <AppointmentMonthChip
                    key={appointment.id}
                    appointment={appointment}
                    artistAvatars={artistAvatars}
                    onSelect={() => onSelectAppointment(appointment)}
                  />
                ))}

                {/* More items indicator button */}
                {hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDayOverviewDate(day)
                    }}
                    className="mt-1 flex h-5 w-full min-w-0 cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-md border border-border bg-muted/60 px-1 text-2xs font-extrabold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                  >
                    <span className="hidden @[85px]:inline truncate">+ עוד {hiddenCount} פגישות</span>
                    <span className="@[85px]:hidden">+{hiddenCount}</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Day Overview Dialog for dense or expanded viewing */}
      <DayOverviewDialog
        date={dayOverviewDate}
        open={dayOverviewDate !== null}
        onOpenChange={(open) => !open && setDayOverviewDate(null)}
        appointments={appointments}
        artistAvatars={artistAvatars}
        onSelectAppointment={onSelectAppointment}
        onNewAppointment={onSelectSlot}
      />
    </div>
  )
}

export default MonthGrid
