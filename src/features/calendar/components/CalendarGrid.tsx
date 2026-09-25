import React from 'react'
import { ChevronLeft, ChevronRight } from '@/components/ui/icon'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { WeekGrid } from './WeekGrid'
import { MonthGrid } from './MonthGrid'
import { DailyAppointmentCards } from './DailyAppointmentCards'
import { CalendarLegend } from './CalendarLegend'
import {
  addDays,
  addMonths,
  formatDayTitle,
  formatMonthTitle,
  formatWeekRange,
  weekDays,
  isSameDay,
  isToday,
  toYmd,
  HEBREW_DAYS_SHORT,
} from '../utils/date-utils'
import { cn } from '#/lib/utils.ts'
import { useIsMobile } from '#/hooks/useMediaQuery'

/** `day` is the phone-sized variant of `week` — same grid, one column. */
export type CalendarMode = 'day' | 'week' | 'month'

interface CalendarGridProps {
  mode: CalendarMode
  onModeChange: (mode: CalendarMode) => void
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
  appointments: ApiAppointment[]
  busyPeriods: ApiExternalBusyPeriod[]
  artistAvatars: Record<string, string>
  workingHours: WorkingHoursWindow[] | null
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string) => void
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  mode,
  onModeChange,
  anchorDate,
  onAnchorDateChange,
  appointments,
  busyPeriods,
  artistAvatars,
  workingHours,
  onSelectAppointment,
  onSelectSlot,
}) => {
  const isMobile = useIsMobile()

  const step = (direction: 1 | -1) => {
    if (isMobile) {
      onAnchorDateChange(addDays(anchorDate, direction))
    } else {
      onAnchorDateChange(
        mode === 'day'
          ? addDays(anchorDate, direction)
          : mode === 'week'
            ? addDays(anchorDate, 7 * direction)
            : addMonths(anchorDate, direction),
      )
    }
  }

  const title =
    mode === 'day'
      ? formatDayTitle(anchorDate)
      : mode === 'week'
        ? formatWeekRange(anchorDate)
        : formatMonthTitle(anchorDate)

  const modeButton = (value: CalendarMode, label: string, className = '') => (
    <button
      type="button"
      onClick={() => onModeChange(value)}
      className={`h-8 cursor-pointer rounded-xl px-3 text-sm font-bold transition-all duration-150 ease-native ${
        mode === value ? 'bg-card font-extrabold text-foreground shadow-sm' : 'text-muted-foreground'
      } ${className}`}
      aria-pressed={mode === value}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-border bg-card rounded-3xl overflow-hidden shadow-sm font-assistant">
      <div dir="rtl" className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 lg:px-4">
        <button
          type="button"
          onClick={() => step(-1)}
          className="tap-target text-muted-foreground"
          aria-label="הקודם"
        >
          <ChevronRight size={18} />
        </button>

        <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-4">
          <h4 className="truncate text-base font-extrabold text-foreground">{title}</h4>
          {/* Calendar view modes: Day, Week, Month */}
          <div className="hidden lg:flex select-none rounded-2xl bg-muted p-1">
            {modeButton('day', 'יום')}
            {modeButton('week', 'שבוע')}
            {modeButton('month', 'חודש')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          className="tap-target text-muted-foreground"
          aria-label="הבא"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Mobile-only Day Carousel/Strip */}
      <div className="flex lg:hidden items-center justify-between border-b border-border px-2 py-2 gap-1">
        {weekDays(anchorDate).map((day) => {
          const active = isSameDay(day, anchorDate)
          const today = isToday(day)
          const isWeekend = day.getDay() === 5 || day.getDay() === 6
          const dayNameShort = HEBREW_DAYS_SHORT[day.getDay()]
          return (
            <button
              key={toYmd(day)}
              type="button"
              onClick={() => onAnchorDateChange(day)}
              className={cn(
                'flex flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-xl py-2 transition-all duration-150 ease-native cursor-pointer',
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : today
                    ? 'bg-primary/10 text-primary'
                    : isWeekend
                      ? 'text-muted-foreground opacity-40'
                      : 'text-muted-foreground',
              )}
            >
              <span className="text-xs font-bold">{dayNameShort}</span>
              <span className="text-base font-extrabold tabular-nums">{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      {isMobile && mode === 'day' ? (
        <div className="px-3 py-3">
          <DailyAppointmentCards
            appointments={appointments
              .filter((a) => a.date === toYmd(anchorDate))
              .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))}
            artistAvatars={artistAvatars}
            onSelectAppointment={onSelectAppointment}
            onNewAppointment={() => onSelectSlot(toYmd(anchorDate), '10:00')}
          />
        </div>
      ) : mode === 'week' || mode === 'day' ? (
        <WeekGrid
          anchorDate={anchorDate}
          appointments={appointments}
          busyPeriods={busyPeriods}
          artistAvatars={artistAvatars}
          workingHours={workingHours}
          onSelectAppointment={onSelectAppointment}
          onSelectSlot={onSelectSlot}
          dayCount={mode === 'day' ? 1 : 7}
        />
      ) : (
        <MonthGrid
          anchorDate={anchorDate}
          appointments={appointments}
          busyPeriods={busyPeriods}
          artistAvatars={artistAvatars}
          onSelectAppointment={onSelectAppointment}
          onSelectSlot={onSelectSlot}
        />
      )}

      <CalendarLegend />
    </div>
  )
}

export default CalendarGrid
