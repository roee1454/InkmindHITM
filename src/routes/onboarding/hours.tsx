import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { HourPicker } from '@/components/ui/hour-picker'
import { getCurrentSession } from '@/features/auth/server/auth'
import {
  getWorkingHours,
  saveWorkingHours,
  type WorkingHoursWindow,
} from '@/features/settings/server/profiles'
import { ArrowLeft, ArrowRight, Clock, Copy, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/onboarding/hours')({
  loader: () => getCurrentSession(),
  component: HoursStep,
})

const DAY_LABELS = ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת']

const CompactTimeline: React.FC<{ startTime?: string; endTime?: string }> = ({ startTime, endTime }) => {
  const toMins = (t?: string) => {
    if (!t) return 0
    const [h = 0, m = 0] = t.split(':').map(Number)
    return (h || 0) * 60 + (m || 0)
  }

  const startMins = toMins(startTime || '11:00')
  const endMins = toMins(endTime || '19:00')
  const dayStart = 6 * 60
  const dayEnd = 24 * 60
  const total = dayEnd - dayStart

  const right = Math.max(0, Math.min(100, ((startMins - dayStart) / total) * 100))
  const endPercent = Math.max(0, Math.min(100, ((endMins - dayStart) / total) * 100))
  const width = Math.max(0, endPercent - right)

  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted" title={`${startTime} - ${endTime}`}>
      <div className="absolute h-full rounded-full bg-primary transition-all duration-300" style={{ right: `${right}%`, width: `${width}%` }} />
    </div>
  )
}

function HoursStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [windows, setWindows] = useState<WorkingHoursWindow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hoursQuery = useQuery({
    queryKey: ['working-hours', session?.staff.id],
    queryFn: () => getWorkingHours({ data: { staffId: session!.staff.id } }),
    enabled: Boolean(session?.staff.id),
  })

  useEffect(() => {
    if (hoursQuery.data !== undefined) {
      if (hoursQuery.data.length > 0) {
        setWindows(hoursQuery.data)
      } else {
        // Default default 5 days a week 10:00 to 18:00
        setWindows([
          { dayOfWeek: 0, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 2, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
          { dayOfWeek: 4, startTime: '10:00', endTime: '18:00' },
        ])
      }
    }
  }, [hoursQuery.data])

  const dayWindow = (dayOfWeek: number) => windows?.find((w) => w.dayOfWeek === dayOfWeek)

  const toggleDay = (dayOfWeek: number) => {
    if (!windows) return
    const existing = dayWindow(dayOfWeek)
    setWindows(
      existing
        ? windows.filter((w) => w.dayOfWeek !== dayOfWeek)
        : [...windows, { dayOfWeek, startTime: '10:00', endTime: '18:00' }]
    )
  }

  const updateTime = (dayOfWeek: number, field: 'startTime' | 'endTime', value: string) => {
    if (!windows) return
    setWindows(windows.map((w) => (w.dayOfWeek === dayOfWeek ? { ...w, [field]: value } : w)))
  }

  const applyPresetToAll = (start: string, end: string) => {
    if (!windows) return
    setWindows(windows.map((w) => ({ ...w, startTime: start, endTime: end })))
  }

  const copyHoursToAll = (source: WorkingHoursWindow) => {
    if (!windows) return
    setWindows(windows.map((w) => ({ ...w, startTime: source.startTime, endTime: source.endTime })))
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!session || !windows) return
      await saveWorkingHours({
        data: {
          staffId: session.staff.id,
          windows,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', session?.staff.id] })
      navigate({ to: '/onboarding/team' })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת שעות העבודה')
    },
  })

  const hasInvalidHours = windows?.some((w) => {
    const [sh = 0, sm = 0] = (w.startTime || '00:00').split(':').map(Number)
    const [eh = 0, em = 0] = (w.endTime || '00:00').split(':').map(Number)
    return sh * 60 + sm >= eh * 60 + em
  }) ?? false

  if (!session) return null

  return (
    <div className="space-y-6 text-right font-assistant" dir="rtl">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">שעות הפעילות שלך</h2>
            <p className="text-xs text-muted-foreground">הגדירו את השעות שבהן ניתן לקבוע איתך תורים ופגישות</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/40 p-3">
          <span className="text-xs font-bold text-muted-foreground">שבלונות מהירות:</span>
          <button
            type="button"
            onClick={() => applyPresetToAll('09:00', '17:00')}
            className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            בוקר (09:00 - 17:00)
          </button>
          <button
            type="button"
            onClick={() => applyPresetToAll('10:00', '18:00')}
            className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            סטנדרט (10:00 - 18:00)
          </button>
          <button
            type="button"
            onClick={() => applyPresetToAll('12:00', '20:00')}
            className="cursor-pointer rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
          >
            ערב (12:00 - 20:00)
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-rose-500">{error}</p>}
        {hasInvalidHours && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-400">
            <AlertTriangle size={14} className="shrink-0" />
            שעת ההתחלה חייבת להיות מוקדמת משעת הסיום.
          </div>
        )}

        {/* Days Table */}
        <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {DAY_LABELS.map((label, dayOfWeek) => {
            const w = dayWindow(dayOfWeek)
            const active = Boolean(w)
            return (
              <div
                key={dayOfWeek}
                className={`flex h-[52px] items-center justify-between px-3.5 transition-colors ${
                  active ? 'bg-card' : 'bg-muted/10'
                }`}
              >
                <div className="flex w-32 shrink-0 items-center gap-3">
                  <Switch checked={active} onCheckedChange={() => toggleDay(dayOfWeek)} />
                  <span className={`text-sm font-bold ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}>
                    {label}
                  </span>
                </div>

                {w ? (
                  <div className="flex flex-1 items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <HourPicker
                        value={w.startTime || '10:00'}
                        onChange={(val) => updateTime(dayOfWeek, 'startTime', val)}
                        step={30}
                        hideIcon
                        className="h-8 w-[74px] justify-center px-2 text-xs font-bold"
                      />
                      <span className="text-xs font-bold text-muted-foreground/60">עד</span>
                      <HourPicker
                        value={w.endTime || '18:00'}
                        onChange={(val) => updateTime(dayOfWeek, 'endTime', val)}
                        step={30}
                        hideIcon
                        className="h-8 w-[74px] justify-center px-2 text-xs font-bold"
                      />
                    </div>

                    <div className="hidden max-w-[140px] flex-1 px-2 md:block">
                      <CompactTimeline startTime={w.startTime} endTime={w.endTime} />
                    </div>

                    <button
                      type="button"
                      onClick={() => copyHoursToAll(w)}
                      className="shrink-0 cursor-pointer rounded-lg border border-border p-1.5 text-muted-foreground/70 transition-all hover:border-primary/40 hover:text-primary"
                      title="העתק שעות אלו לכל הימים הפעילים"
                    >
                      <Copy size={13} />
                    </button>
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

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/onboarding/profile' })}
          className="rounded-xl px-5 font-bold cursor-pointer gap-2"
        >
          <ArrowRight size={16} />
          <span>חזרה</span>
        </Button>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || hasInvalidHours}
          className="rounded-xl px-6 font-bold cursor-pointer gap-2"
        >
          <span>{saveMutation.isPending ? 'שומר שעות...' : 'המשך לצוות והרשאות'}</span>
          <ArrowLeft size={16} />
        </Button>
      </div>
    </div>
  )
}
