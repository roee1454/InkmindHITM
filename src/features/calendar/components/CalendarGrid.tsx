import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { WeekGrid } from './WeekGrid'
import { MonthGrid } from './MonthGrid'
import { addDays, addMonths, formatMonthTitle, formatWeekRange } from '../date-utils'

export type CalendarMode = 'week' | 'month'

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
  const step = (direction: 1 | -1) =>
    onAnchorDateChange(mode === 'week' ? addDays(anchorDate, 7 * direction) : addMonths(anchorDate, direction))

  const title = mode === 'week' ? formatWeekRange(anchorDate) : formatMonthTitle(anchorDate)

  const modeButton = (value: CalendarMode, label: string) => (
    <button
      type="button"
      onClick={() => onModeChange(value)}
      className={`px-3 py-1 text-xs font-semibold transition-colors cursor-pointer rounded-xl ${
        mode === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-pressed={mode === value}
    >
      {label}
    </button>
  )

  return (
    <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm font-assistant">
      <div dir="rtl" className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => step(-1)}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer rounded-lg hover:bg-muted/50"
          aria-label="הקודם"
        >
          <ChevronRight size={18} />
        </button>

        <div className="flex items-center gap-4">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          <div className="flex border border-border bg-muted/40 p-0.5 rounded-xl">
            {modeButton('week', 'שבוע')}
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

      {mode === 'week' ? (
        <WeekGrid
          anchorDate={anchorDate}
          appointments={appointments}
          busyPeriods={busyPeriods}
          artistAvatars={artistAvatars}
          workingHours={workingHours}
          onSelectAppointment={onSelectAppointment}
          onSelectSlot={onSelectSlot}
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
