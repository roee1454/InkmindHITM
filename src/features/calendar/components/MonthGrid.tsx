import React from 'react'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import { artistColor } from '../artist-colors'
import { HEBREW_DAYS_SHORT, buildMonthMatrix, isSameMonth, isToday, toYmd, minutesToTime, timeToMinutes } from '../date-utils'

const DEFAULT_SLOT = '12:00'

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
    <div dir="rtl" className="font-assistant">
      <div className="grid grid-cols-7 border-b border-border">
        {HEBREW_DAYS_SHORT.map((label) => (
          <div key={label} className="py-3 text-center text-mini font-bold text-muted-foreground">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((day) => {
          const outside = !isSameMonth(day, anchorDate)
          const today = isToday(day)
          const dayAppointments = appointmentsForDay(day)

          return (
            <div
              key={toYmd(day)}
              onClick={() => onSelectSlot(toYmd(day), DEFAULT_SLOT)}
              className={`min-h-[104px] border-b border-l border-border p-1.5 transition-all duration-200 hover:bg-primary/10 hover:scale-[0.99] cursor-pointer ${
                outside ? 'bg-muted/30' : ''
              } ${today ? 'bg-card/30' : ''}`}
            >
              <div className="mb-1 flex justify-start">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center px-1 text-mini font-bold ${
                    today
                      ? 'rounded-full bg-primary text-primary-foreground'
                      : outside
                        ? 'text-muted-foreground/60'
                        : 'text-muted-foreground'
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {busyForDay(day).map((busy) => (
                  <div
                    key={busy.googleEventId}
                    style={BUSY_STRIPES}
                    className="pointer-events-none flex w-full items-center gap-1 truncate rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-right text-micro text-muted-foreground"
                  >
                    {timeOf(busy.startsAt)} חסימה חיצונית
                  </div>
                ))}
                {dayAppointments.map((appointment) => {
                  const durationHours = (appointment.durationMinutes || 120) / 60
                  const startMinutes = timeToMinutes(appointment.timeSlot)
                  const endMinutes = startMinutes + durationHours * 60
                  const timeRange = `${appointment.timeSlot} - ${minutesToTime(endMinutes)}`

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectAppointment(appointment)
                      }}
                      className={`flex w-full items-center gap-1 truncate border-2 bg-card px-1.5 py-0.5 text-right text-micro text-foreground transition-all duration-200 hover:scale-[1.03] hover:shadow-md cursor-pointer rounded-md ${
                        appointment.isException
                          ? 'border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                          : artistColor(appointment.staffId).block
                      } ${appointment.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
                    >
                      {appointment.staffId && artistAvatars[appointment.staffId] && (
                        <img
                          src={artistAvatars[appointment.staffId]}
                          alt=""
                          className="h-3 w-3 shrink-0 rounded-full object-cover"
                        />
                      )}
                      <span className="truncate">
                        {timeRange} {appointment.leadName || 'לקוח'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MonthGrid
