import React from 'react'
import { Copy } from '@/components/ui/icon'
import { Switch } from '@/components/ui/switch'
import { HourPicker } from '@/components/ui/hour-picker'
import { DAY_LABELS } from '#/lib/working-hours.ts'
import type { WorkingHoursWindow } from '#/lib/working-hours.ts'
import { cn } from '#/lib/utils.ts'

export interface HoursPreset {
  label: string
  startTime: string
  endTime: string
}

const DEFAULT_PRESETS: HoursPreset[] = [
  { label: 'בוקר (09:00 - 17:00)', startTime: '09:00', endTime: '17:00' },
  { label: 'צהריים (11:00 - 19:00)', startTime: '11:00', endTime: '19:00' },
  { label: 'ערב (12:00 - 20:00)', startTime: '12:00', endTime: '20:00' },
]

export interface WeeklyHoursEditorProps {
  windows: WorkingHoursWindow[]
  onChange: (windows: WorkingHoursWindow[]) => void
  readOnly?: boolean
  /** Quick-preset chips above the day list. Pass `[]` to hide the row entirely. */
  presets?: HoursPreset[]
  /** Applied to a day the moment it's switched on. */
  defaultStartTime?: string
  defaultEndTime?: string
  className?: string
}

/** A compact, non-interactive bar showing where in the day a window falls — hidden below `md`,
 *  where the numeric start–end pair already carries that information on its own. */
const DayRangeTimeline: React.FC<{ startTime: string; endTime: string }> = ({ startTime, endTime }) => {
  const toMins = (t: string) => {
    const [h = 0, m = 0] = t.split(':').map(Number)
    return h * 60 + m
  }
  const dayStart = 6 * 60
  const dayEnd = 24 * 60
  const total = dayEnd - dayStart
  const right = Math.max(0, Math.min(100, ((toMins(startTime) - dayStart) / total) * 100))
  const endPercent = Math.max(0, Math.min(100, ((toMins(endTime) - dayStart) / total) * 100))

  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
      title={`טווח שעות מתוכנן: ${startTime} - ${endTime}`}
    >
      <div
        className="absolute h-full rounded-full bg-primary transition-all duration-300"
        style={{ right: `${right}%`, width: `${Math.max(0, endPercent - right)}%` }}
      />
    </div>
  )
}

/**
 * Global, reusable weekly working-hours editor — a controlled `windows`/`onChange` list of
 * per-day switches + time ranges, quick presets, and a copy-to-all-days action.
 *
 * Currently wired only into the Team screen (`ArtistProfileEditor`); built as a standalone,
 * feature-agnostic component under `src/components/` (not `components/ui/`, which is reserved
 * for Shadcn primitives — see `docs/architecture.md`) so Onboarding/Invite's own hours editor
 * can adopt it later without a rewrite.
 */
export const WeeklyHoursEditor: React.FC<WeeklyHoursEditorProps> = ({
  windows,
  onChange,
  readOnly = false,
  presets = DEFAULT_PRESETS,
  defaultStartTime = '11:00',
  defaultEndTime = '19:00',
  className,
}) => {
  const dayWindow = (dayOfWeek: number) => windows.find((w) => w.dayOfWeek === dayOfWeek)

  const toggleDay = (dayOfWeek: number) => {
    if (readOnly) return
    const existing = dayWindow(dayOfWeek)
    onChange(
      existing
        ? windows.filter((w) => w.dayOfWeek !== dayOfWeek)
        : [...windows, { dayOfWeek, startTime: defaultStartTime, endTime: defaultEndTime }],
    )
  }

  const updateDayTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    if (readOnly) return
    onChange(windows.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: value } : w)))
  }

  const applyPresetToAll = (startTime: string, endTime: string) => {
    if (readOnly || windows.length === 0) return
    onChange(windows.map((w) => ({ ...w, startTime, endTime })))
  }

  const copyHoursToAll = (source: WorkingHoursWindow) => {
    if (readOnly) return
    onChange(
      windows.map((w) => ({
        ...w,
        startTime: source.startTime || defaultStartTime,
        endTime: source.endTime || defaultEndTime,
      })),
    )
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      {!readOnly && presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/50 p-3">
          <span className="text-xs font-bold text-muted-foreground">שבלונות מהירות:</span>
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPresetToAll(preset.startTime, preset.endTime)}
              disabled={windows.length === 0}
              className="pill cursor-pointer border border-border bg-card text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-40"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {DAY_LABELS.map((label, dayOfWeek) => {
          const w = dayWindow(dayOfWeek)
          const active = !!w
          return (
            <div
              key={dayOfWeek}
              className={cn(
                'flex flex-wrap items-center gap-y-2 px-3.5 py-3 transition-colors duration-150 sm:h-14 sm:flex-nowrap sm:justify-between sm:py-0',
                active ? 'bg-card' : 'bg-muted/10',
              )}
            >
              <div className="flex shrink-0 items-center gap-3 text-right sm:w-32">
                <Switch checked={active} onCheckedChange={() => toggleDay(dayOfWeek)} disabled={readOnly} />
                <span className={cn('text-sm font-bold', active ? 'text-foreground' : 'text-muted-foreground/50')}>
                  {label}
                </span>
              </div>

              {w ? (
                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 sm:gap-4">
                  <HourPicker
                      value={w.startTime || defaultStartTime}
                      onChange={(val) => updateDayTime(dayOfWeek, 'startTime', val)}
                      step={30}
                      hideIcon
                      disabled={readOnly}
                      className="h-6 w-[76px] justify-center rounded-lg border-0  px-2 text-[4px] font-bold hover:bg-card sm:w-[80px]"
                    />
                    <span className="select-none text-xs font-bold text-muted-foreground/60">עד</span>
                    <HourPicker
                      value={w.endTime || defaultEndTime}
                      onChange={(val) => updateDayTime(dayOfWeek, 'endTime', val)}
                      step={30}
                      hideIcon
                      disabled={readOnly}
                      className="h-6 w-[76px] justify-center rounded-lg border-0 px-2 text-[4px] font-bold hover:bg-card sm:w-[80px]"
                    />

                  <div className="hidden max-w-[160px] flex-1 px-2 md:block">
                    <DayRangeTimeline
                      startTime={w.startTime || defaultStartTime}
                      endTime={w.endTime || defaultEndTime}
                    />
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => copyHoursToAll(w)}
                      className="shrink-0 cursor-pointer rounded-lg border border-border p-1.5 text-muted-foreground/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                      title="העתק שעות אלו לכל הימים הפעילים"
                    >
                      <Copy size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex h-8 flex-1 items-center justify-start text-xs font-medium text-muted-foreground/40">
                  יום חופש / מנוחה
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default WeeklyHoursEditor
