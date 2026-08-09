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
    <div className="hidden lg:flex border border-border bg-muted/40 p-0.5 rounded-xl font-assistant" dir="rtl">
      <button
        type="button"
        onClick={() => onViewModeChange('calendar')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
          viewMode === 'calendar'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Calendar size={14} /> לוח שנה
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('table')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
          viewMode === 'table'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <List size={14} /> רשימה
      </button>
    </div>
  )
}

export default CalendarViewToggle
