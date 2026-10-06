import React from 'react'
import { Plus } from '@/components/ui/icon'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import type { ApiAppointment } from '../types'
import { formatDayTitle, toYmd } from '../utils/date-utils'
import { AppointmentCard } from './AppointmentCard'

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
      size="lg"
      title={formatDayTitle(date)}
      description={dayAppointments.length === 0 ? 'אין תורים ביום הזה.' : `${dayAppointments.length} תורים · ${tattooCount} קעקועים · ${sketchCount} סקיצות`}
      footer={
        <DialogActions>
          <Button type="button" onClick={handleCreate} className="gap-1.5">
            <Plus size={14} />
            תור חדש ביום הזה
          </Button>
        </DialogActions>
      }
    >
      {dayAppointments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">היום פנוי.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {dayAppointments.map((appt) => (
            <AppointmentCard key={appt.id} mode="row" appointment={appt} artistAvatars={artistAvatars} onSelect={() => handleRowClick(appt)} />
          ))}
        </div>
      )}
    </ResponsiveDialog>
  )
}

export default DayOverviewDialog
