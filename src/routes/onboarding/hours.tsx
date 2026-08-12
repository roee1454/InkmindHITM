import { useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { getCurrentSession } from '@/features/auth/server/auth'
import { getWorkingHours, saveWorkingHours, type WorkingHoursWindow } from '@/features/settings/server/profiles'
import { WorkHoursEditor } from '@/features/onboarding/components/WorkHoursEditor'
import { DEFAULT_HOURS_PRESET, HOURS_PRESETS } from '@/features/onboarding/components/work-hours'

export const Route = createFileRoute('/onboarding/hours')({
  loader: () => getCurrentSession(),
  component: HoursStep,
})

const DAY_CHIPS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const ACTIVE_DAYS = new Set([0, 1, 2, 3, 4])

function HoursStep() {
  const session = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [windows, setWindows] = useState<WorkingHoursWindow[]>(DEFAULT_HOURS_PRESET)
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof HOURS_PRESETS>('standard')
  const [showDetail, setShowDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hoursQuery = useQuery({
    queryKey: ['working-hours', session?.staff.id],
    queryFn: () => getWorkingHours({ data: { staffId: session!.staff.id } }),
    enabled: Boolean(session?.staff.id),
  })

  useEffect(() => {
    if (hoursQuery.data && hoursQuery.data.length > 0) setWindows(hoursQuery.data)
  }, [hoursQuery.data])

  const applyPreset = (key: keyof typeof HOURS_PRESETS) => {
    const preset = HOURS_PRESETS[key]
    setSelectedPreset(key)
    setWindows(windows.map((w) => ({ ...w, startTime: preset.startTime, endTime: preset.endTime })))
  }

  const saveMutation = useMutation({
    mutationFn: () => saveWorkingHours({ data: { staffId: session!.staff.id, windows } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', session?.staff.id] })
      navigate({ to: '/onboarding/profile-links' })
    },
    onError: (err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בשמירת שעות העבודה'),
  })

  if (!session) return null

  // The first active window's hours drive the big confirm-line display — matches the "all
  // days share one range" mental model the preset buttons assume.
  const displayWindow = windows.find((w) => ACTIVE_DAYS.has(w.dayOfWeek)) ?? windows[0]

  return (
    <div className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question">אלה שעות הפעילות שלך?</h1>
        <p className="step-hint">מילאנו את הנפוץ ביותר. אם זה מדויק — אשר והמשך.</p>
      </div>

      {showDetail ? (
        <WorkHoursEditor value={windows} onChange={setWindows} />
      ) : (
        <div className="card-native flex flex-col gap-[18px] p-5">
          <div className="flex gap-1.5">
            {DAY_CHIPS.map((label, dayOfWeek) => {
              const active = ACTIVE_DAYS.has(dayOfWeek)
              return (
                <div
                  key={dayOfWeek}
                  className={`flex h-[46px] flex-1 items-center justify-center rounded-[14px] text-[15px] font-extrabold ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2.5 tabular-nums">
            <span className="text-[30px] font-extrabold text-foreground">{displayWindow?.startTime ?? '10:00'}</span>
            <span className="text-[17px] font-bold text-muted-foreground">עד</span>
            <span className="text-[30px] font-extrabold text-foreground">{displayWindow?.endTime ?? '18:00'}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(HOURS_PRESETS) as (keyof typeof HOURS_PRESETS)[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`h-[42px] cursor-pointer select-none rounded-[13px] border text-[13px] font-bold transition-all duration-150 ease-native ${
                  selectedPreset === key
                    ? 'border-primary bg-primary/10 font-extrabold text-primary'
                    : 'border-border/80 text-muted-foreground'
                }`}
              >
                {HOURS_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-[13px] font-bold text-destructive">{error}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="btn-native">
          <Check size={18} />
          {saveMutation.isPending ? 'שומר…' : 'כן, זה מדויק'}
        </button>
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="cursor-pointer text-center text-[14.5px] font-extrabold text-primary"
        >
          {showDetail ? 'הצג תצוגה מקוצרת' : 'עריכת יום ספציפי'}
        </button>
      </div>
    </div>
  )
}
