import { useMemo, useState } from 'react'
import { Plus } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import type { StaffMember } from '@/features/settings/server/staff'
import type { ApiAppointment, ApiExternalBusyPeriod } from '../types'
import { ArtistBadge } from './ArtistBadge'
import { AppointmentCard } from './AppointmentCard'
import { DayOverviewDialog } from './DayOverviewDialog'
import { useFillRowHeight } from '../hooks/use-fill-row-height'
import { layoutOverlaps } from '../utils/overlap-layout'
import { gridHourRange, hoursIn } from '../utils/grid-hours'
import { staffScheduledOn } from '../utils/staff-schedule'
import { minutesToTime, timeToMinutes, toYmd } from '../utils/date-utils'

const MIN_ROW_HEIGHT = 64
/** Narrower than this and a card has nowhere to put a name next to the avatar. */
const MIN_COLUMN_WIDTH = 200

interface DayResourceGridProps {
  date: Date
  appointments: ApiAppointment[]
  busyPeriods: ApiExternalBusyPeriod[]
  staff: StaffMember[]
  artistAvatars: Record<string, string>
  onSelectAppointment: (appointment: ApiAppointment) => void
  onSelectSlot: (date: string, timeSlot: string, staffId?: string) => void
}

/**
 * Day view as a resource calendar (track-b B6.8): one column per artist instead of one column per
 * overlapping appointment. This is the standard shape for salon/studio booking software (Fresha,
 * Vagaro, Booksy, Square Appointments) and for Google Calendar's own resource view — three artists
 * booked at the same hour are three artists working, not a scheduling conflict, and a column-per-
 * date grid has no way to say that.
 */
export function DayResourceGrid({ date, appointments, busyPeriods, staff, artistAvatars, onSelectAppointment, onSelectSlot }: DayResourceGridProps) {
  const [overviewStaffId, setOverviewStaffId] = useState<string | null>(null)
  const ymd = toYmd(date)

  const columns = useMemo(() => staffScheduledOn(staff, appointments, date), [staff, appointments, date])
  const hourRange = useMemo(() => gridHourRange(columns.flatMap((s) => s.workHours)), [columns])
  const hours = hoursIn(hourRange)
  const gridStartMinutes = hourRange.startHour * 60
  const gridEndMinutes = (hourRange.endHour + 1) * 60

  const { scrollRef, headerRef, rowHeight } = useFillRowHeight(hours.length, MIN_ROW_HEIGHT)

  const appointmentsFor = (staffId: string) => {
    const timed = appointments
      .filter((a) => a.date === ymd && a.staffId === staffId)
      .map((appointment) => ({
        appointment,
        startMinutes: timeToMinutes(appointment.timeSlot),
        endMinutes: timeToMinutes(appointment.timeSlot) + (appointment.durationMinutes || 120),
      }))
    const layout = layoutOverlaps(timed)
    return timed.map((item) => ({ ...item, ...layout.get(item)! }))
  }

  const busyFor = (staffId: string) => busyPeriods.filter((b) => b.staffId === staffId && toYmd(new Date(b.startsAt)) === ymd)

  if (columns.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-sm font-semibold text-muted-foreground">
        <span>אין מקעקעים שעובדים ביום זה</span>
        <button type="button" onClick={() => onSelectSlot(ymd, '10:00')} className="cursor-pointer font-bold text-primary hover:underline">
          לקבוע תור בכל זאת
        </button>
      </div>
    )
  }

  return (
    <div ref={scrollRef} dir="rtl" className="h-full overflow-auto font-assistant">
      <div className="flex min-h-full flex-col" style={{ minWidth: columns.length * MIN_COLUMN_WIDTH }}>
        <div ref={headerRef} className="sticky top-0 z-20 flex shrink-0 border-b border-border bg-card">
          <div className="sticky start-0 z-10 w-14 shrink-0 bg-card" />
          {columns.map((member) => (
            <div key={member.id} className="group flex flex-1 items-center justify-between gap-1.5 border-s border-border px-2.5 py-2">
              <button
                type="button"
                onClick={() => setOverviewStaffId(member.id)}
                title={`כל הפגישות של ${member.name}`}
                className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 transition-colors duration-150 hover:bg-muted"
              >
                <ArtistBadge staffId={member.id} staffName={member.name} avatarUrl={artistAvatars[member.id]} size={20} />
                <span className="truncate text-sm font-extrabold text-foreground">{member.name}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSlot(ymd, minutesToTime(hourRange.startHour * 60 + 120), member.id)}
                title={`קבע תור ל-${member.name}`}
                aria-label={`קבע תור ל-${member.name}`}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all duration-150 hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <Plus size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-1">
          <div className="sticky start-0 z-10 flex w-14 shrink-0 flex-col bg-card">
            {hours.map((hour) => (
              <div key={hour} style={{ height: rowHeight }} className="shrink-0 border-b border-border px-2 pt-1 text-center text-2xs font-medium tabular-nums text-muted-foreground">
                {minutesToTime(hour * 60)}
              </div>
            ))}
            <div className="flex-1" />
          </div>

          {columns.map((member) => (
            <div key={member.id} className="relative flex flex-1 flex-col border-s border-border">
              {hours.map((hour) => {
                const outside = !fitsWithinWorkingHours(member.workHours, ymd, minutesToTime(hour * 60), 1)
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => onSelectSlot(ymd, minutesToTime(hour * 60), member.id)}
                    style={{ height: rowHeight }}
                    aria-label={`קבע תור ל-${member.name} בשעה ${minutesToTime(hour * 60)}`}
                    className={cn(
                      'group/slot relative block w-full shrink-0 cursor-pointer border-b border-border transition-colors duration-150 hover:bg-accent-soft',
                      outside && 'bg-muted/40',
                    )}
                  >
                    <span className="pointer-events-none absolute end-2 top-1.5 select-none text-2xs font-bold text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/slot:opacity-100">
                      {minutesToTime(hour * 60)}
                    </span>
                  </button>
                )
              })}

              {busyFor(member.id).map((busy) => {
                const start = new Date(busy.startsAt)
                const startMinutes = start.getHours() * 60 + start.getMinutes()
                const rawTop = ((startMinutes - gridStartMinutes) / 60) * rowHeight
                const top = Math.max(rawTop, 0)
                const durationHours = (new Date(busy.endsAt).getTime() - start.getTime()) / 3_600_000
                const maxHeight = ((gridEndMinutes - gridStartMinutes) / 60) * rowHeight - top
                const height = Math.min(durationHours * rowHeight - (top - rawTop), maxHeight)
                if (maxHeight <= 0 || height <= 0) return null
                return (
                  <div key={busy.googleEventId} style={{ top, height: Math.max(height, 24) }} className="pointer-events-none absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-border bg-muted/50 px-2 py-1 text-right">
                    <div className="truncate text-2xs font-semibold text-muted-foreground">חסימת יומן חיצוני</div>
                  </div>
                )
              })}

              {appointmentsFor(member.id).map(({ appointment, startMinutes, column, columnCount, span }) => {
                const unit = 100 / columnCount
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
                    widthPercent={unit * span}
                    artistAvatars={artistAvatars}
                    onSelect={() => onSelectAppointment(appointment)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <DayOverviewDialog
        date={overviewStaffId ? date : null}
        open={overviewStaffId !== null}
        onOpenChange={(open) => !open && setOverviewStaffId(null)}
        appointments={overviewStaffId ? appointments.filter((a) => a.staffId === overviewStaffId) : []}
        artistAvatars={artistAvatars}
        onSelectAppointment={onSelectAppointment}
        onNewAppointment={(d, t) => onSelectSlot(d, t, overviewStaffId ?? undefined)}
      />
    </div>
  )
}

export default DayResourceGrid
