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
    <div className="hidden items-center justify-between gap-3 lg:flex" dir="rtl">
      <div className="page-head">
        <h1>תורים</h1>
        <p>
          {todayCount} היום • {upcomingCount} קרובים
        </p>
      </div>
      <div className="flex items-center gap-3">
        <CalendarViewToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
        <Button onClick={onNewAppointment} className="shrink-0 gap-1.5">
          <Plus size={16} /> תור חדש
        </Button>
      </div>
    </div>
  )
}

export default CalendarHeader
