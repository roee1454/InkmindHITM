import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { WeekGrid } from './WeekGrid'
import { MonthGrid } from './MonthGrid'
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
} from '../date-utils'
import { cn } from '#/lib/utils.ts'
import { useIsMobile } from '@/hooks/use-media-query'

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
      className={`cursor-pointer rounded-xl px-3 py-1 text-xs font-semibold transition-colors active:bg-card/70 ${
        mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      } ${className}`}
      aria-pressed={mode === value}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm font-assistant">
      <div dir="rtl" className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 lg:px-4">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/50"
          aria-label="הקודם"
        >
          <ChevronRight size={18} />
        </button>

        <div className="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-4">
          <h4 className="truncate text-sm font-bold text-foreground">{title}</h4>
          {/* The toggle stays two-wide at every size: `יום` below lg, `שבוע` at lg and up. */}
          <div className="hidden lg:flex rounded-xl border border-border bg-muted/40 p-0.5">
            {modeButton('day', 'יום', 'lg:hidden')}
            {modeButton('week', 'שבוע', 'hidden lg:block')}
            {modeButton('month', 'חודש')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/50"
          aria-label="הבא"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Mobile-only Day Carousel/Strip */}
      <div className="flex lg:hidden items-center justify-between border-b border-border bg-muted/20 px-3 py-2 gap-1">
        {weekDays(anchorDate).map((day) => {
          const active = isSameDay(day, anchorDate)
          const today = isToday(day)
          const dayNameShort = HEBREW_DAYS_SHORT[day.getDay()]
          return (
            <button
              key={toYmd(day)}
              type="button"
              onClick={() => onAnchorDateChange(day)}
              className={cn(
                "flex flex-1 flex-col items-center justify-center py-2 rounded-xl transition-all cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground font-bold shadow-xs scale-105"
                  : today
                    ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="text-[10px] uppercase tracking-wider">{dayNameShort}</span>
              <span className="text-sm font-bold mt-0.5">{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      {mode === 'week' || mode === 'day' ? (
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
    </div>
  )
}

export default CalendarGrid
