import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { WeeklyHoursEditor } from '@/components/WeeklyHoursEditor'
import { getWorkingHours, saveWorkingHours } from '@/features/settings/server/settings'
import { isValidTimeRange } from '#/lib/working-hours.ts'
import type { WorkingHoursWindow } from '#/lib/working-hours.ts'
import { SettingsSection } from '@/features/settings/components/settings-layout'
import { useSettingsSave } from '@/features/settings/components/settings-save'
import { summarizeWorkingHours } from '../utils/summarizeWorkingHours'

/** The weekly hours the bot offers appointments in, saved with the page's save bar. */
export function MemberHoursSection({ staffId, readOnly }: { staffId: string; readOnly: boolean }) {
  const queryClient = useQueryClient()
  const hours = useQuery<WorkingHoursWindow[]>({ queryKey: ['working-hours', staffId], queryFn: () => getWorkingHours({ data: { staffId } }) })
  const [windows, setWindows] = useState<WorkingHoursWindow[] | null>(null)

  useEffect(() => {
    if (hours.data !== undefined) setWindows(hours.data)
  }, [hours.data])

  const invalid = windows?.some((w) => !isValidTimeRange(w)) ?? false

  useSettingsSave(`member-hours-${staffId}`, {
    dirty: !readOnly && windows !== null && hours.data !== undefined && JSON.stringify(windows) !== JSON.stringify(hours.data),
    save: async () => {
      if (invalid || !windows) throw new Error('בשעות העבודה יש טווח ששעת הסיום שלו לפני שעת ההתחלה.')
      await saveWorkingHours({ data: { staffId, windows } })
      await queryClient.invalidateQueries({ queryKey: ['working-hours', staffId] })
      queryClient.invalidateQueries({ queryKey: ['artist-profiles'] })
    },
    reset: () => setWindows(hours.data ?? null),
  })

  return (
    // Bare: the weekly editor (shared with onboarding) brings its own surface; wrapping it in the
    // section's card would nest one inside the other.
    <SettingsSection title="שעות עבודה" description={hours.data ? `${summarizeWorkingHours(hours.data)}. הבוט מציע תורים רק בשעות האלה.` : 'הבוט מציע תורים רק בשעות האלה.'} bare>
      {windows === null ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : (
        <div className="flex flex-col gap-3">
          {invalid && !readOnly && <p className="px-1 text-xs font-bold text-destructive">שעת ההתחלה צריכה להיות לפני שעת הסיום.</p>}
          <WeeklyHoursEditor windows={windows} onChange={(next) => !readOnly && setWindows(next)} readOnly={readOnly} />
        </div>
      )}
    </SettingsSection>
  )
}
