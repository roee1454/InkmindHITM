import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkHoursWindow } from '@/integrations/pocketbase/types'
import { DAY_LABELS, TIME_OPTIONS, findWindow } from './work-hours'

interface WorkHoursEditorProps {
  value: WorkHoursWindow[]
  onChange: (next: WorkHoursWindow[]) => void
}

export function WorkHoursEditor({ value, onChange }: WorkHoursEditorProps) {
  function toggleDay(dayOfWeek: number, enabled: boolean) {
    if (enabled) {
      onChange([...value, { day_of_week: dayOfWeek, start_time: '09:00', end_time: '17:00' }])
    } else {
      onChange(value.filter((w) => w.day_of_week !== dayOfWeek))
    }
  }

  function updateTime(dayOfWeek: number, field: 'start_time' | 'end_time', time: string) {
    onChange(value.map((w) => (w.day_of_week === dayOfWeek ? { ...w, [field]: time } : w)))
  }

  return (
    <div className="space-y-2">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const window = findWindow(value, dayOfWeek)
        const enabled = Boolean(window)
        return (
          <div key={dayOfWeek} className="flex items-center gap-3 py-1.5">
            <Switch checked={enabled} onCheckedChange={(checked) => toggleDay(dayOfWeek, checked)} />
            <span className="w-24 text-sm">{label}</span>
            {enabled && window ? (
              <div className="flex items-center gap-2">
                <Select
                  value={window.start_time}
                  onValueChange={(time) => updateTime(dayOfWeek, 'start_time', time)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">עד</span>
                <Select
                  value={window.end_time}
                  onValueChange={(time) => updateTime(dayOfWeek, 'end_time', time)}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">סגור</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
