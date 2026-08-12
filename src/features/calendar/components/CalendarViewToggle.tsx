import React from 'react'
import { Calendar, List } from 'lucide-react'

export type ViewMode = 'calendar' | 'table'

interface CalendarViewToggleProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export const CalendarViewToggle: React.FC<CalendarViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="hidden select-none items-center gap-1 rounded-2xl bg-muted p-1 font-assistant lg:flex" dir="rtl">
      <button
        type="button"
        onClick={() => onViewModeChange('calendar')}
        className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[14.5px] font-bold transition-all duration-150 ease-native ${
          viewMode === 'calendar' ? 'bg-card font-extrabold text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        <Calendar size={16} /> לוח שנה
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-[14.5px] font-bold transition-all duration-150 ease-native ${
          viewMode === 'table' ? 'bg-card font-extrabold text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        <List size={16} /> רשימה
      </button>
    </div>
  )
}

export default CalendarViewToggle
