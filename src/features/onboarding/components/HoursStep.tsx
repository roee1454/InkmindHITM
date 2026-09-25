import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check } from '@/components/ui/icon'
import { getWorkingHours, saveWorkingHours } from '@/features/settings/server/profiles'
import type { WorkingHoursWindow } from '@/features/settings/server/profiles'
import { getCurrentSession } from '@/features/auth/server/auth'
import { WeeklyHoursEditor } from '@/components/WeeklyHoursEditor'
import { DEFAULT_HOURS_PRESET, HOURS_PRESETS } from '../utils/work-hours'
import { useOnboardingUiStore } from '../store/onboardingUiStore'
import type { CurrentSession } from '@/features/auth/server/auth'

const DAY_CHIPS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

interface HoursStepProps {
  session?: CurrentSession | null
}

export function HoursStep({ session: initialSession }: HoursStepProps) {
  const queryClient = useQueryClient()

  const { data: sessionData } = useQuery({
    queryKey: ['current-session'],
    queryFn: () => getCurrentSession(),
    enabled: !initialSession,
  })

  const session = initialSession ?? sessionData

  const [windows, setWindows] = useState<WorkingHoursWindow[]>(DEFAULT_HOURS_PRESET)
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof HOURS_PRESETS>('standard')
  const [showDetail, setShowDetail] = useState(false)

  const hoursError = useOnboardingUiStore((s) => s.hoursError)
  const setHoursError = useOnboardingUiStore((s) => s.setHoursError)
  const nextStep = useOnboardingUiStore((s) => s.nextStep)

  const staffId = session?.staff?.id

  const hoursQuery = useQuery({
    queryKey: ['working-hours', staffId],
    queryFn: () => getWorkingHours({ data: { staffId: staffId! } }),
    enabled: Boolean(staffId),
  })

  useEffect(() => {
    if (hoursQuery.data && hoursQuery.data.length > 0) setWindows(hoursQuery.data)
  }, [hoursQuery.data])

  const applyPreset = (key: keyof typeof HOURS_PRESETS) => {
    const preset = HOURS_PRESETS[key]
    setSelectedPreset(key)
    setWindows(windows.map((w) => ({ ...w, startTime: preset.startTime, endTime: preset.endTime })))
  }

  function toggleDay(dayOfWeek: number) {
    const exists = windows.some((w) => w.dayOfWeek === dayOfWeek)
    if (exists) {
      setWindows(windows.filter((w) => w.dayOfWeek !== dayOfWeek))
    } else {
      const template = windows[0]
      setWindows(
        [
          ...windows,
          {
            dayOfWeek,
            startTime: template?.startTime ?? '10:00',
            endTime: template?.endTime ?? '18:00',
          },
        ].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      )
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!staffId) throw new Error('רשומת מנהל חסרה.')
      if (windows.length === 0) {
        throw new Error('חובה להגדיר לפחות יום עבודה אחד פעיל')
      }
      return saveWorkingHours({
        data: {
          staffId,
          windows,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', staffId] })
      setHoursError(null)
      nextStep()
    },
    onError: (err: unknown) =>
      setHoursError(err instanceof Error ? err.message : 'שגיאה בשמירת שעות פעילות'),
  })

  return (
    <div className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">שעות פעילות שבועיות</h1>
        <p className="step-hint">
          השעות בהן הסטודיו פתוח והבוט רשאי לתאם תורים. תוכל לשנות זאת בכל רגע.
        </p>
      </div>

      {showDetail ? (
        <WeeklyHoursEditor windows={windows} onChange={setWindows} presets={[]} />
      ) : (
        <div className="card-native flex flex-col gap-4 p-5">
          {/* Day chips */}
          <div className="flex gap-1.5">
            {DAY_CHIPS.map((label, dayOfWeek) => {
              const active = windows.some((w) => w.dayOfWeek === dayOfWeek)
              return (
                <button
                  key={dayOfWeek}
                  type="button"
                  onClick={() => toggleDay(dayOfWeek)}
                  aria-pressed={active}
                  className={`flex h-[46px] flex-1 cursor-pointer items-center justify-center rounded-xl text-base font-extrabold transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Time range callout */}
          <div className="flex items-center justify-center gap-2.5 tabular-nums">
            <span className="text-3xl font-extrabold text-foreground">
              {windows[0]?.startTime ?? '10:00'}
            </span>
            <span className="text-lg font-bold text-muted-foreground">עד</span>
            <span className="text-3xl font-extrabold text-foreground">
              {windows[0]?.endTime ?? '18:00'}
            </span>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(HOURS_PRESETS) as (keyof typeof HOURS_PRESETS)[]).map((key) => {
              const preset = HOURS_PRESETS[key]
              const active = selectedPreset === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className={`h-[42px] cursor-pointer select-none rounded-xl border text-xs font-bold transition-all duration-150 ease-native ${
                    active
                      ? 'border-primary bg-primary/10 font-extrabold text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {windows.length === 0 && (
        <p className="text-sm font-bold text-destructive">חובה להגדיר לפחות יום עבודה אחד פעיל</p>
      )}

      {hoursError && <p className="text-sm font-bold text-destructive">{hoursError}</p>}

      <div className="flex-1" />

      <div className="step-footer">
        <button
          type="button"
          disabled={saveMutation.isPending || windows.length === 0}
          onClick={() => saveMutation.mutate()}
          className="btn-native"
        >
          <Check size={18} />
          <span>{saveMutation.isPending ? 'שומר…' : 'אישור שעות והמשך'}</span>
        </button>
        <button
          type="button"
          onClick={() => setShowDetail((v) => !v)}
          className="cursor-pointer text-center text-sm font-extrabold text-primary hover:underline"
        >
          {showDetail ? 'חזרה לתצוגה מהירה' : 'פירוט לפי ימים'}
        </button>
      </div>
    </div>
  )
}
