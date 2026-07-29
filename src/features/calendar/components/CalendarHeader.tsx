import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CalendarViewToggle, type ViewMode } from './CalendarViewToggle'

interface CalendarHeaderProps {
  todayCount: number
  upcomingCount: number
  onNewAppointment: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  todayCount,
  upcomingCount,
  onNewAppointment,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 font-assistant" dir="rtl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">תורים</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {todayCount} היום • {upcomingCount} קרובים
        </p>
      </div>
      <div className="flex items-center gap-3">
        <CalendarViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <Button
          onClick={onNewAppointment}
          className="flex items-center gap-1.5 font-bold cursor-pointer shrink-0"
        >
          <Plus size={16} /> תור חדש
        </Button>
      </div>
    </div>
  )
}

export default CalendarHeader
