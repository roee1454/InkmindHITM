import React from 'react'
import { Plus } from '@/components/ui/icon'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import type { ApiAppointment } from '../types'
import { formatDayTitle, toYmd } from '../utils/date-utils'
import { AppointmentRowCard } from './AppointmentRowCard'

interface DayOverviewDialogProps {
  date: Date | null
  open: boolean
  onOpenChange: (open: boolean) => void
  appointments: ApiAppointment[]
  artistAvatars?: Record<string, string>
  onSelectAppointment: (appointment: ApiAppointment) => void
  onNewAppointment: (date: string, timeSlot: string) => void
}

export const DayOverviewDialog: React.FC<DayOverviewDialogProps> = ({
  date,
  open,
  onOpenChange,
  appointments,
  artistAvatars = {},
  onSelectAppointment,
  onNewAppointment,
}) => {
  if (!date) return null

  const ymd = toYmd(date)
  const dayAppointments = appointments
    .filter((a) => a.date === ymd)
    .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot))

  const tattooCount = dayAppointments.filter((a) => (a.type || 'tattoo') === 'tattoo').length
  const sketchCount = dayAppointments.filter((a) => a.type === 'sketch').length

  const handleRowClick = (appt: ApiAppointment) => {
    onOpenChange(false)
    onSelectAppointment(appt)
  }

  const handleCreate = () => {
    onOpenChange(false)
    onNewAppointment(ymd, '10:00')
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={formatDayTitle(date)}
      description={
        dayAppointments.length === 0
          ? 'אין תורים מתוכננים ליום זה'
          : `סה״כ ${dayAppointments.length} פגישות (${tattooCount} קעקועים · ${sketchCount} סקיצות)`
      }
      contentClassName="sm:max-w-xl max-h-[85vh] overflow-y-auto"
    >
      <div className="space-y-4 font-assistant text-right" dir="rtl">
        {/* Action button to add a deliberate appointment for this date */}
        <div className="flex items-center justify-between pb-1 border-b border-border">
          <span className="text-xs font-bold text-muted-foreground">
            {dayAppointments.length} פגישות בלוח
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            className="flex items-center gap-1.5 text-xs font-extrabold rounded-xl"
          >
            <Plus size={14} />
            <span>תור חדש ליום זה</span>
          </Button>
        </div>

        {/* Appointments list */}
        {dayAppointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-2xl border border-dashed border-border">
            <span className="text-xs font-bold text-muted-foreground">
              אין פגישות או תורים ליום זה
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCreate}
              className="mt-3 text-xs font-bold rounded-xl"
            >
              <Plus size={14} className="ms-1" />
              קבע תור ראשון
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pe-1">
            {dayAppointments.map((appt) => (
              <AppointmentRowCard
                key={appt.id}
                appointment={appt}
                artistAvatars={artistAvatars}
                onSelect={() => handleRowClick(appt)}
              />
            ))}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  )
}

export default DayOverviewDialog
