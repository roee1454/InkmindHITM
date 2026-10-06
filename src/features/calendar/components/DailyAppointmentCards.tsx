import React from 'react'
import type { ApiAppointment } from '../types'
import { Plus } from '@/components/ui/icon'
import { AppointmentCard } from './AppointmentCard'

interface DailyAppointmentCardsProps {
  appointments: ApiAppointment[]
  artistAvatars?: Record<string, string>
  onSelectAppointment: (appointment: ApiAppointment) => void
  onNewAppointment: () => void
}

export const DailyAppointmentCards: React.FC<DailyAppointmentCardsProps> = ({
  appointments,
  artistAvatars = {},
  onSelectAppointment,
  onNewAppointment,
}) => {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-2xl border border-border">
        <span className="text-sm font-bold text-muted-foreground">
          אין תורים ליום זה
        </span>
        <button
          type="button"
          onClick={onNewAppointment}
          className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-extrabold text-primary hover:bg-primary/20 cursor-pointer"
        >
          <Plus size={15} />
          <span>קבע תור חדש</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 font-assistant" dir="rtl">
      {appointments.map((appt) => (
        <AppointmentCard
          key={appt.id}
          mode="row"
          appointment={appt}
          artistAvatars={artistAvatars}
          onSelect={() => onSelectAppointment(appt)}
        />
      ))}
    </div>
  )
}

export default DailyAppointmentCards
