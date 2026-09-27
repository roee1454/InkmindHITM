import React from 'react'
import { cn } from '#/lib/utils.ts'
import { useIsMobile } from '#/hooks/useMediaQuery'
import type { StaffMember } from '@/features/settings/server/staff'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import type { GridHourRange } from '../utils/grid-hours'
import type { CalendarViewMode } from '../utils/view-mode'
import { WeekGrid } from './WeekGrid'
import { MonthGrid } from './MonthGrid'
import { DayResourceGrid } from './DayResourceGrid'
import { DailyAppointmentCards } from './DailyAppointmentCards'
import { HEBREW_DAYS_SHORT, isSameDay, isToday, toYmd, weekDays } from '../utils/date-utils'

/** The three modes that draw a calendar; `list` is a table and never reaches this component. */
export type CalendarGridMode = Exclude<CalendarViewMode, 'list'>

interface CalendarGridProps {
  mode: CalendarGridMode
  anchorDate: Date
  onAnchorDateChange: (date: Date) => void
  appointments: ApiAppointment[]
  busyPeriods: ApiExternalBusyPeriod[]
  staff: StaffMember[]
  artistAvatars: Record<string, string>
  workingHours: WorkingHoursWindow[] | null
  hourRange: GridHourRange
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string, staffId?: string) => void
}

/**
 * The calendar body (track-b B6.8). Navigation, filters and the legend moved to `CalendarToolbar`,
 * and the outer card is gone: this fills the screen it's given and owns its own scroll.
 */
export const CalendarGrid: React.FC<CalendarGridProps> = ({
  mode,
  anchorDate,
  onAnchorDateChange,
  appointments,
  busyPeriods,
  staff,
  artistAvatars,
  workingHours,
  hourRange,
  onSelectAppointment,
  onSelectSlot,
}) => {
  const isMobile = useIsMobile()

  return (
    <div className="flex min-h-0 flex-1 flex-col font-assistant">
      {/* Phone-only week strip: the toolbar's arrows step one day at a time, this jumps within the week. */}
      <div dir="rtl" className="flex items-center gap-1 border-b border-border px-2 py-2 lg:hidden">
        {weekDays(anchorDate).map((day) => {
          const active = isSameDay(day, anchorDate)
          const today = isToday(day)
          return (
            <button
              key={toYmd(day)}
              type="button"
              onClick={() => onAnchorDateChange(day)}
              className={cn(
                'flex flex-1 cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors duration-150',
                active
                  ? 'bg-primary text-primary-foreground'
                  : today
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted-foreground',
              )}
            >
              <span className="text-2xs font-bold">{HEBREW_DAYS_SHORT[day.getDay()]}</span>
              <span className="text-base font-extrabold tabular-nums">{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1">
        {isMobile && mode === 'day' ? (
          <div className="h-full overflow-y-auto px-3 py-3">
            <DailyAppointmentCards
              appointments={appointments
                .filter((a) => a.date === toYmd(anchorDate))
                .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))}
              artistAvatars={artistAvatars}
              onSelectAppointment={onSelectAppointment}
              onNewAppointment={() => onSelectSlot(toYmd(anchorDate), '10:00')}
            />
          </div>
        ) : mode === 'day' ? (
          <DayResourceGrid
            date={anchorDate}
            appointments={appointments}
            busyPeriods={busyPeriods}
            staff={staff}
            artistAvatars={artistAvatars}
            onSelectAppointment={onSelectAppointment}
            onSelectSlot={onSelectSlot}
          />
        ) : mode === 'month' ? (
          <MonthGrid
            anchorDate={anchorDate}
            appointments={appointments}
            busyPeriods={busyPeriods}
            artistAvatars={artistAvatars}
            onSelectAppointment={onSelectAppointment}
            onSelectSlot={onSelectSlot}
          />
        ) : (
          <WeekGrid
            anchorDate={anchorDate}
            appointments={appointments}
            busyPeriods={busyPeriods}
            artistAvatars={artistAvatars}
            workingHours={workingHours}
            hourRange={hourRange}
            onSelectAppointment={onSelectAppointment}
            onSelectSlot={onSelectSlot}
          />
        )}
      </div>
    </div>
  )
}

export default CalendarGrid
