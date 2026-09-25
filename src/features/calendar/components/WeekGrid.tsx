import React, { useState } from 'react'
import { Plus } from '@/components/ui/icon'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import { layoutOverlaps } from '../utils/overlap-layout'
import {
  HEBREW_DAYS_LONG,
  isToday,
  minutesToTime,
  timeToMinutes,
  toYmd,
  visibleDays,
} from '../utils/date-utils'
import { DayOverviewDialog } from './DayOverviewDialog'
import { AppointmentGridCard } from './AppointmentGridCard'

const START_HOUR = 8
const END_HOUR = 20
const ROW_HEIGHT = 56
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

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
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string) => void
  dayCount?: 1 | 7
}

export const WeekGrid: React.FC<WeekGridProps> = ({
  anchorDate,
  appointments,
  busyPeriods,
  artistAvatars,
  workingHours,
  onSelectAppointment,
  onSelectSlot,
  dayCount = 7,
}) => {
  const [dayOverviewDate, setDayOverviewDate] = useState<Date | null>(null)
  const days = visibleDays(anchorDate, dayCount)

  const isOutsideHours = (day: Date, hour: number) =>
    !!workingHours && !fitsWithinWorkingHours(workingHours, toYmd(day), minutesToTime(hour * 60), 1)

  const appointmentsForDay = (day: Date) => {
    const dayAppointments = appointments.filter((a) => a.date === toYmd(day))
    const timed = dayAppointments.map((appointment) => {
      const startMinutes = timeToMinutes(appointment.timeSlot)
      const durationHours = (appointment.durationMinutes || 120) / 60
      return { appointment, startMinutes, endMinutes: startMinutes + durationHours * 60 }
    })
    const overlapLayout = layoutOverlaps(timed)
    return timed.map((item) => ({ ...item, ...overlapLayout.get(item)! }))
  }

  const busyForDay = (day: Date) => busyPeriods.filter((b) => toYmd(new Date(b.startsAt)) === toYmd(day))

  return (
    <div dir="rtl" className="overflow-x-auto font-assistant">
      {/* Single-day mode fits any phone, so it must not inherit the week view's scroll floor. */}
      <div className={dayCount === 1 ? '' : 'min-w-[840px]'}>
        {/* Day headers */}
        <div className="flex border-b border-border">
          <div className="w-16 shrink-0" />
          {days.map((day) => {
            const dayAppts = appointments.filter((a) => a.date === toYmd(day))
            const today = isToday(day)
            return (
              <div
                key={toYmd(day)}
                className={`group relative flex-1 border-r border-border px-2 py-2 text-center transition-colors ${
                  today ? 'bg-card/60' : 'hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-mini text-muted-foreground font-semibold">
                    {HEBREW_DAYS_LONG[day.getDay()]}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectSlot(toYmd(day), '10:00')
                    }}
                    className="size-5 rounded-md flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/15 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    title={`קבע תור ל-${toYmd(day)}`}
                    aria-label={`קבע תור ל-${toYmd(day)}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDayOverviewDate(day)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all cursor-pointer hover:ring-2 hover:ring-primary/40 ${
                      today
                        ? 'bg-primary text-primary-foreground font-extrabold shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                    title={`צפה בכל הפגישות של ${day.getDate()}`}
                  >
                    <span className="text-sm font-bold">{day.getDate()}</span>
                    {dayAppts.length > 0 && (
                      <span className={`text-2xs font-extrabold px-1.5 py-0.2 rounded-full ${today ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {dayAppts.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Hour rows */}
        <div className="flex">
          {/* Hour labels */}
          <div className="w-16 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: ROW_HEIGHT }}
                className="border-b border-border px-2 pt-1 text-center text-mini text-muted-foreground font-medium tabular-nums"
              >
                {minutesToTime(hour * 60)}
              </div>
            ))}
          </div>

          {days.map((day) => (
            <div
              key={toYmd(day)}
              className={`relative flex-1 border-r border-border ${isToday(day) ? 'bg-card/30' : ''}`}
            >
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  type="button"
                  onClick={() => onSelectSlot(toYmd(day), minutesToTime(hour * 60))}
                  style={{ height: ROW_HEIGHT }}
                  className={`group/slot relative block w-full border-b border-border transition-colors duration-150 hover:bg-primary/[0.08] cursor-pointer ${
                    isOutsideHours(day, hour) ? 'bg-muted/40' : ''
                  }`}
                  aria-label={`קבע תור ל-${toYmd(day)} בשעה ${minutesToTime(hour * 60)}`}
                >
                  <span className="opacity-0 group-hover/slot:opacity-100 transition-opacity duration-150 absolute top-1.5 right-2 text-micro text-primary font-bold inline-flex items-center gap-1 pointer-events-none select-none">
                    <Plus size={10} /> {minutesToTime(hour * 60)}
                  </span>
                </button>
              ))}

              {busyForDay(day).map((busy) => {
                const start = new Date(busy.startsAt)
                const end = new Date(busy.endsAt)
                const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60
                const durationHours = (end.getTime() - start.getTime()) / 3_600_000
                const rawTop = (startMinutes / 60) * ROW_HEIGHT
                const top = Math.max(rawTop, 0)
                const clippedAtTop = top - rawTop
                const maxHeight = (END_HOUR + 1 - START_HOUR) * ROW_HEIGHT - top
                const height = Math.min(durationHours * ROW_HEIGHT - clippedAtTop, maxHeight)
                if (maxHeight <= 0 || height <= 0) return null

                return (
                  <div
                    key={busy.googleEventId}
                    style={{ top, height: Math.max(height, 24), ...BUSY_STRIPES }}
                    className="pointer-events-none absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-border bg-muted/50 px-2 py-1 text-right"
                  >
                    <div className="flex items-center gap-1 truncate text-micro font-semibold text-muted-foreground">
                      חסימת יומן חיצוני
                    </div>
                    <div className="truncate text-micro text-muted-foreground/80">
                      {minutesToTime(start.getHours() * 60 + start.getMinutes())}–{minutesToTime(end.getHours() * 60 + end.getMinutes())}
                    </div>
                  </div>
                )
              })}

              {appointmentsForDay(day).map(({ appointment, startMinutes: absoluteStartMinutes, column, columnCount }) => {
                const is7Day = dayCount === 7
                if (is7Day && column >= 3) {
                  return null
                }

                const effectiveColumnCount = is7Day ? Math.min(columnCount, 3) : columnCount
                const isOverflowSlot = is7Day && columnCount > 3 && column === 2

                const startMinutes = absoluteStartMinutes - START_HOUR * 60
                const durationHours = (appointment.durationMinutes || 120) / 60
                const top = (startMinutes / 60) * ROW_HEIGHT
                const maxHeight = (END_HOUR + 1 - START_HOUR) * ROW_HEIGHT - top
                const height = Math.min(durationHours * ROW_HEIGHT, maxHeight)
                if (top < 0 || maxHeight <= 0) return null

                const widthPercent = 100 / effectiveColumnCount

                return (
                  <AppointmentGridCard
                    key={appointment.id}
                    appointment={appointment}
                    top={top}
                    height={height}
                    column={column}
                    columnCount={columnCount}
                    widthPercent={widthPercent}
                    artistAvatars={artistAvatars}
                    onSelect={() => onSelectAppointment(appointment)}
                    isOverflowSlot={isOverflowSlot}
                    overflowCount={columnCount - 2}
                    onOverflowClick={() => setDayOverviewDate(day)}
                  />
                )
              })}
            </div>
          ))}
        </div>
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

export default WeekGrid
