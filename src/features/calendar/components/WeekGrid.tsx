import React from 'react'
import { TriangleAlert } from 'lucide-react'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import { artistColor } from '../artist-colors'
import { layoutOverlaps } from '../overlap-layout'
import {
  HEBREW_DAYS_LONG,
  isToday,
  minutesToTime,
  timeToMinutes,
  toYmd,
  visibleDays,
} from '../date-utils'

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
  /**
   * 7 = the full week (desktop default). 1 = a single day column, used on phones where seven
   * ~40px columns are unusable. Everything below maps over `days` with `flex-1` columns and
   * percentage-based absolute positioning, so shortening the array is the whole change.
   */
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
  const days = visibleDays(anchorDate, dayCount)

  const isOutsideHours = (day: Date, hour: number) =>
    !!workingHours && !fitsWithinWorkingHours(workingHours, toYmd(day), minutesToTime(hour * 60), 1)

  const appointmentsForDay = (day: Date) => {
    const dayAppointments = appointments.filter((a) => a.date === toYmd(day))
    const timed = dayAppointments.map((appointment) => {
      const startMinutes = timeToMinutes(appointment.timeSlot)
      const durationHours = appointment.durationHours || 2
      return { appointment, startMinutes, endMinutes: startMinutes + durationHours * 60 }
    })
    const overlapLayout = layoutOverlaps(timed)
    return timed.map((item) => ({ ...item, ...overlapLayout.get(item)! }))
  }

  const busyForDay = (day: Date) => busyPeriods.filter((b) => toYmd(new Date(b.startsAt)) === toYmd(day))

  return (
    <div dir="rtl" className="overflow-x-auto font-assistant">
      {/* Single-day mode fits any phone, so it must not inherit the week view's scroll floor. */}
      <div className={dayCount === 1 ? '' : 'min-w-[720px]'}>
        {/* Day headers */}
        <div className="flex border-b border-border">
          <div className="w-16 shrink-0" />
          {days.map((day) => (
            <div
              key={toYmd(day)}
              className={`flex-1 border-r border-border px-2 py-3 text-center ${
                isToday(day) ? 'bg-card/60' : ''
              }`}
            >
              <div className="text-mini text-muted-foreground">{HEBREW_DAYS_LONG[day.getDay()]}</div>
              <div className={`text-sm font-bold ${isToday(day) ? 'text-foreground' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Hour rows */}
        <div className="flex">
          {/* Hour labels */}
          <div className="w-16 shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: ROW_HEIGHT }}
                className="border-b border-border pl-2 pt-1 text-left text-mini text-muted-foreground"
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
                  className={`block w-full border-b border-border transition-all duration-200 hover:bg-primary/15 hover:scale-[0.99] cursor-pointer ${
                    isOutsideHours(day, hour) ? 'bg-muted/40' : ''
                  }`}
                  aria-label={`קבע תור ל-${toYmd(day)} בשעה ${minutesToTime(hour * 60)}`}
                />
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
                    className="pointer-events-none absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-border/70 bg-muted/50 px-2 py-1 text-right"
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
                const startMinutes = absoluteStartMinutes - START_HOUR * 60
                const durationHours = appointment.durationHours || 2
                const top = (startMinutes / 60) * ROW_HEIGHT
                const maxHeight = (END_HOUR + 1 - START_HOUR) * ROW_HEIGHT - top
                const height = Math.min(durationHours * ROW_HEIGHT, maxHeight)
                if (top < 0 || maxHeight <= 0) return null

                const widthPercent = 100 / columnCount
                const endMinutes = absoluteStartMinutes + durationHours * 60
                const timeRange = `${appointment.timeSlot} - ${minutesToTime(endMinutes)}`
                const isCompact = durationHours < 1

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() => onSelectAppointment(appointment)}
                    style={{
                      top,
                      height: Math.max(height, 24),
                      right: `calc(${column * widthPercent}% + 4px)`,
                      width: `calc(${widthPercent}% - 8px)`,
                    }}
                    className={`absolute z-10 overflow-hidden border-2 bg-card px-2 py-1 text-right transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:z-20 cursor-pointer rounded-lg ${
                      appointment.isException
                        ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                        : artistColor(appointment.staffId).block
                    } ${appointment.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
                  >
                    {isCompact ? (
                      <div className="flex items-center gap-1.5 h-full">
                        {appointment.staffId && artistAvatars[appointment.staffId] && (
                          <img
                            src={artistAvatars[appointment.staffId]}
                            alt=""
                            className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                          />
                        )}
                        {appointment.isException && (
                          <TriangleAlert size={10} className="shrink-0 text-amber-500" aria-label="מחוץ לשעות העבודה" />
                        )}
                        <div className="flex flex-col text-right justify-center truncate select-none leading-none">
                          <div className="truncate text-micro font-bold text-foreground">
                            {appointment.leadName || 'לקוח'}
                          </div>
                          <div className="truncate text-micro text-muted-foreground mt-0.5">
                            {timeRange} ({durationHours}ש׳)
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 h-full py-0.5 justify-between">
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 truncate">
                            {appointment.staffId && artistAvatars[appointment.staffId] && (
                              <img
                                src={artistAvatars[appointment.staffId]}
                                alt=""
                                className="h-5 w-5 shrink-0 rounded-full object-cover border border-border"
                              />
                            )}
                            <div className="flex flex-col text-right truncate">
                              <div className="truncate text-mini font-bold text-foreground leading-tight">
                                {appointment.leadName || 'לקוח'}
                              </div>
                              <div className="truncate text-micro text-muted-foreground mt-0.5">
                                {timeRange} ({durationHours}ש׳)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="truncate text-micro text-foreground/90 bg-muted/40 px-1 py-0.5 rounded border border-border/30">
                          {appointment.style || 'אין תיאור'}
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeekGrid
