import { HOURS_PRESETS } from '@/features/onboarding/utils/work-hours'
import { WeeklyHoursEditor } from '@/components/WeeklyHoursEditor'
import { DAY_CHIPS } from '../types'
import type { PresetKey } from '../types'
import { useInviteUiStore } from '../store/inviteUiStore'
import { useInviteMutations } from '../hooks/useInviteMutations'

export function Step3WorkHours() {
  const windows = useInviteUiStore((s) => s.windows)
  const setWindows = useInviteUiStore((s) => s.setWindows)
  const selectedPreset = useInviteUiStore((s) => s.selectedPreset)
  const showHoursDetail = useInviteUiStore((s) => s.showHoursDetail)
  const setShowHoursDetail = useInviteUiStore((s) => s.setShowHoursDetail)
  const hoursError = useInviteUiStore((s) => s.hoursError)
  const toggleDay = useInviteUiStore((s) => s.toggleDay)
  const applyPreset = useInviteUiStore((s) => s.applyPreset)

  const { saveHoursMutation } = useInviteMutations()

  return (
    <div className="step-body">
      <div className="flex flex-col gap-2">
        <h1 className="step-question text-3xl">ימי ושעות פעילות בסטודיו</h1>
        <p className="step-hint">
          סמן את הימים והשעות בהם אתה זמין לקבל לקוחות. תוכל לשנות זאת תמיד בהגדרות.
        </p>
      </div>

      {showHoursDetail ? (
        <WeeklyHoursEditor windows={windows} onChange={setWindows} presets={[]} />
      ) : (
        <div className="card-native flex flex-col gap-4 p-5">
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
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2.5 tabular-nums">
            <span className="text-3xl font-extrabold text-foreground">{windows[0]?.startTime ?? '10:00'}</span>
            <span className="text-lg font-bold text-muted-foreground">עד</span>
            <span className="text-3xl font-extrabold text-foreground">{windows[0]?.endTime ?? '18:00'}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(HOURS_PRESETS) as PresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`h-[42px] cursor-pointer select-none rounded-xl border text-xs font-bold transition-all duration-150 ease-native ${
                  selectedPreset === key
                    ? 'border-primary bg-primary/10 font-extrabold text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {HOURS_PRESETS[key].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {windows.length === 0 && (
        <p className="text-sm font-bold text-destructive">יש לבחור לפחות יום עבודה אחד פעיל</p>
      )}

      {hoursError && <p className="text-sm font-bold text-destructive">{hoursError}</p>}

      <div className="flex-1" />
      <div className="step-footer">
        <button
          type="button"
          disabled={saveHoursMutation.isPending || windows.length === 0}
          onClick={() => saveHoursMutation.mutate()}
          className="btn-native cursor-pointer"
        >
          {saveHoursMutation.isPending ? 'שומר…' : 'אישור והמשך לחיבור יומן'}
        </button>
        <button
          type="button"
          onClick={() => setShowHoursDetail((v) => !v)}
          className="cursor-pointer text-center text-sm font-extrabold text-primary"
        >
          {showHoursDetail ? 'הצג תצוגה מקוצרת' : 'עריכת יום ספציפי'}
        </button>
      </div>
    </div>
  )
}

