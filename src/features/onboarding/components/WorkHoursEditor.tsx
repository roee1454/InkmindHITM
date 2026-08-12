import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WorkingHoursWindow } from '@/features/settings/server/profiles'
import { DAY_LABELS, TIME_OPTIONS, findWindow } from './work-hours'

interface WorkHoursEditorProps {
  value: WorkingHoursWindow[]
  onChange: (next: WorkingHoursWindow[]) => void
}

/** The "עריכת יום ספציפי" detail view behind onboarding's confirm-the-default hours screen —
 *  also reusable anywhere a per-day hours editor is needed. Operates on the same camelCase
 *  `WorkingHoursWindow` shape as `features/settings/server/profiles.ts`'s
 *  `getWorkingHours`/`saveWorkingHours`, the single source of truth for working hours. */
export function WorkHoursEditor({ value, onChange }: WorkHoursEditorProps) {
  function toggleDay(dayOfWeek: number, enabled: boolean) {
    if (enabled) {
      onChange([...value, { dayOfWeek, startTime: '10:00', endTime: '18:00' }])
    } else {
      onChange(value.filter((w) => w.dayOfWeek !== dayOfWeek))
    }
  }

  function updateTime(dayOfWeek: number, field: 'startTime' | 'endTime', time: string) {
    onChange(value.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: time } : w)))
  }

  return (
    <div className="card-native overflow-hidden">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const window = findWindow(value, dayOfWeek)
        const enabled = Boolean(window)
        return (
          <div key={dayOfWeek} className="row-native h-12">
            <Switch checked={enabled} onCheckedChange={(checked) => toggleDay(dayOfWeek, checked)} />
            <span className="w-16 shrink-0 text-[15px] font-bold text-foreground">{label}</span>
            {enabled && window ? (
              <div className="flex flex-1 items-center justify-end gap-2">
                <Select value={window.startTime} onValueChange={(time) => updateTime(dayOfWeek, 'startTime', time)}>
                  <SelectTrigger className="h-10 w-28">
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
                <span className="text-[13px] font-bold text-muted-foreground">עד</span>
                <Select value={window.endTime} onValueChange={(time) => updateTime(dayOfWeek, 'endTime', time)}>
                  <SelectTrigger className="h-10 w-28">
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
              <span className="flex-1 text-end text-[13px] font-medium text-muted-foreground">סגור</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
