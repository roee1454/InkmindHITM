import { useQuery } from '@tanstack/react-query'
import { fitsWithinWorkingHours } from '@/lib/working-hours'
import type { WorkingHoursWindow } from '@/lib/working-hours'
import { matchClosureForDate } from '@/lib/closures'
import { getWorkingHours } from '@/features/settings/server/profiles'
import { getStudioClosures } from '@/features/settings/server/closures'

export function useWorkingHoursCheck(
  staffId: string | null,
  date: string,
  timeSlot: string,
  durationHours: number,
) {
  const { data: windows = [] } = useQuery<WorkingHoursWindow[]>({
    queryKey: ['working-hours', staffId],
    queryFn: () => (staffId ? getWorkingHours({ data: { staffId } }) : Promise.resolve([])),
    enabled: !!staffId,
  })

  const { data: closures = [] } = useQuery({
    queryKey: ['studio-closures'],
    queryFn: () => getStudioClosures(),
  })

  const fitsWorkingHours = !staffId || fitsWithinWorkingHours(windows, date, timeSlot, durationHours)
  const closure = date ? matchClosureForDate(closures, date) : { closed: false, reason: null }

  return { fitsWorkingHours, windows, isStudioClosed: closure.closed, closureReason: closure.reason }
}
