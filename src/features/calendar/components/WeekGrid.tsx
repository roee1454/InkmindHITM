import React, { useState } from 'react'
import { Plus } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import { layoutOverlaps } from '../utils/overlap-layout'
import { hoursIn } from '../utils/grid-hours'
import type { GridHourRange } from '../utils/grid-hours'
import { useFillRowHeight } from '../hooks/use-fill-row-height'
import { HEBREW_DAYS_LONG, isToday, minutesToTime, timeToMinutes, toYmd, weekDays } from '../utils/date-utils'
import { DayOverviewDialog } from './DayOverviewDialog'
import { AppointmentCard } from './AppointmentCard'

const MIN_ROW_HEIGHT = 64
/** A card in a 7-way split has no room for a name; the overview dialog covers it instead. */
const MAX_VISIBLE_COLUMNS = 3

const BUSY_STRIPES: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(148, 148, 148, 0.10) 6px, rgba(148, 148, 148, 0.10) 12px)',
}

interface WeekGridProps {
  anchorDate: Date
  appointments: ApiAppointment[]
  busyPeriods: ApiExternalBusyPeriod[]
  artistAvatars: Record<string, string>
  workingHours: WorkingHoursWindow[] | null
  hourRange: GridHourRange
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string) => void
}

/**
 * The week overview (track-b B6.8): columns are dates, so a day with several artists working
 * shows all of them at once — this is the "how busy is the week" screen. The day-by-day workspace
 * is `DayResourceGrid`, one column per artist, which is where a real scheduling conflict (the same
 * artist double-booked) actually shows up as one.
 */
export const WeekGrid: React.FC<WeekGridProps> = ({
  anchorDate,
  appointments,
  busyPeriods,
  artistAvatars,
  workingHours,
  hourRange,
  onSelectAppointment,
  onSelectSlot,
}) => {
  const [dayOverviewDate, setDayOverviewDate] = useState<Date | null>(null)
  const days = weekDays(anchorDate)
  const hours = hoursIn(hourRange)
  const { scrollRef, headerRef, rowHeight } = useFillRowHeight(hours.length, MIN_ROW_HEIGHT)
  const gridStartMinutes = hourRange.startHour * 60
  const gridEndMinutes = (hourRange.endHour + 1) * 60

  const isOutsideHours = (day: Date, hour: number) =>
    !!workingHours && !fitsWithinWorkingHours(workingHours, toYmd(day), minutesToTime(hour * 60), 1)

  const appointmentsForDay = (day: Date) => {
    const timed = appointments
      .filter((a) => a.date === toYmd(day))
      .map((appointment) => {
        const startMinutes = timeToMinutes(appointment.timeSlot)
        return {
          appointment,
          startMinutes,
          endMinutes: startMinutes + (appointment.durationMinutes || 120),
        }
      })
    const overlapLayout = layoutOverlaps(timed)
    return timed.map((item) => ({ ...item, ...overlapLayout.get(item)! }))
  }

  const busyForDay = (day: Date) => busyPeriods.filter((b) => toYmd(new Date(b.startsAt)) === toYmd(day))

  return (
    <div ref={scrollRef} dir="rtl" className="h-full overflow-auto font-assistant">
      {/* `min-h-full` + `flex-1` on the body: when the working day is shorter than the viewport,
          the day columns stretch to the bottom instead of ending mid-screen over dead space. */}
      <div className="flex min-h-full min-w-[840px] flex-col">
        <div ref={headerRef} className="sticky top-0 z-20 flex shrink-0 border-b border-border bg-card">
          <div className="sticky start-0 z-10 w-14 shrink-0 bg-card" />
          {days.map((day) => {
            const dayAppointments = appointments.filter((a) => a.date === toYmd(day))
            const today = isToday(day)
            return (
              <div key={toYmd(day)} className="group relative flex-1 border-s border-border px-2 py-2">
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setDayOverviewDate(day)}
                    title={`כל הפגישות של ${day.getDate()}`}
                    className={cn(
                      'flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-0.5 transition-colors duration-150',
                      today ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span className="text-2xs font-bold">{HEBREW_DAYS_LONG[day.getDay()]}</span>
                    <span className="text-sm font-extrabold tabular-nums">{day.getDate()}</span>
                    {dayAppointments.length > 0 && (
                      <span className={cn('text-2xs font-bold tabular-nums', today ? 'text-primary-foreground/70' : 'text-muted-foreground/70')}>
                        {dayAppointments.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSlot(toYmd(day), minutesToTime(hourRange.startHour * 60 + 120))}
                    title={`קבע תור ל-${toYmd(day)}`}
                    aria-label={`קבע תור ל-${toYmd(day)}`}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-1">
          <div className="sticky start-0 z-10 flex w-14 shrink-0 flex-col bg-card">
            {hours.map((hour) => (
              <div
                key={hour}
                style={{ height: rowHeight }}
                className="shrink-0 border-b border-border px-2 pt-1 text-center text-2xs font-medium tabular-nums text-muted-foreground"
              >
                {minutesToTime(hour * 60)}
              </div>
            ))}
            <div className="flex-1" />
          </div>

          {days.map((day) => (
            <div key={toYmd(day)} className={cn('relative flex flex-1 flex-col border-s border-border', isToday(day) && 'bg-muted/20')}>
              {hours.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => onSelectSlot(toYmd(day), minutesToTime(hour * 60))}
                  style={{ height: rowHeight }}
                  aria-label={`קבע תור ל-${toYmd(day)} בשעה ${minutesToTime(hour * 60)}`}
                  className={cn(
                    'group/slot relative block w-full shrink-0 cursor-pointer border-b border-border transition-colors duration-150 hover:bg-accent-soft',
                    isOutsideHours(day, hour) && 'bg-muted/40',
                  )}
                >
                  <span className="pointer-events-none absolute end-2 top-1.5 select-none text-2xs font-bold text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/slot:opacity-100">
                    {minutesToTime(hour * 60)}
                  </span>
                </button>
              ))}

              {busyForDay(day).map((busy) => {
                const start = new Date(busy.startsAt)
                const end = new Date(busy.endsAt)
                const startMinutes = start.getHours() * 60 + start.getMinutes()
                const rawTop = ((startMinutes - gridStartMinutes) / 60) * rowHeight
                const top = Math.max(rawTop, 0)
                const clippedAtTop = top - rawTop
                const maxHeight = ((gridEndMinutes - gridStartMinutes) / 60) * rowHeight - top
                const durationHours = (end.getTime() - start.getTime()) / 3_600_000
                const height = Math.min(durationHours * rowHeight - clippedAtTop, maxHeight)
                if (maxHeight <= 0 || height <= 0) return null

                return (
                  <div
                    key={busy.googleEventId}
                    style={{ top, height: Math.max(height, 24), ...BUSY_STRIPES }}
                    className="pointer-events-none absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-border bg-muted/50 px-2 py-1 text-right"
                  >
                    <div className="truncate text-2xs font-semibold text-muted-foreground">חסימת יומן חיצוני</div>
                  </div>
                )
              })}

              {appointmentsForDay(day).map(({ appointment, startMinutes, column, columnCount, span }) => {
                if (column >= MAX_VISIBLE_COLUMNS) return null

                const effectiveColumnCount = Math.min(columnCount, MAX_VISIBLE_COLUMNS)
                const isOverflowSlot = columnCount > MAX_VISIBLE_COLUMNS && column === MAX_VISIBLE_COLUMNS - 1
                // A card may span several columns, so its width no longer follows its offset.
                const unit = 100 / effectiveColumnCount
                const visibleSpan = Math.max(1, Math.min(span, effectiveColumnCount - column))

                const top = ((startMinutes - gridStartMinutes) / 60) * rowHeight
                const maxHeight = ((gridEndMinutes - gridStartMinutes) / 60) * rowHeight - top
                const height = Math.min(((appointment.durationMinutes || 120) / 60) * rowHeight, maxHeight)
                if (top < 0 || maxHeight <= 0) return null

                return (
                  <AppointmentCard
                    key={appointment.id}
                    mode="block"
                    appointment={appointment}
                    top={top}
                    height={height}
                    columnCount={columnCount}
                    offsetPercent={unit * column}
                    widthPercent={unit * visibleSpan}
                    artistAvatars={artistAvatars}
                    onSelect={() => onSelectAppointment(appointment)}
                    isOverflowSlot={isOverflowSlot}
                    overflowCount={columnCount - (MAX_VISIBLE_COLUMNS - 1)}
                    onOverflowClick={() => setDayOverviewDate(day)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

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

export default WeekGrid
