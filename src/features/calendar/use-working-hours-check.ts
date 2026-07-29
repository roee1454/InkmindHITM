import { useQuery } from '@tanstack/react-query'
import { fitsWithinWorkingHours, type WorkingHoursWindow } from '@/lib/working-hours'
import { getWorkingHours } from '@/features/settings/server/profiles'

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

  const fitsWorkingHours = !staffId || fitsWithinWorkingHours(windows, date, timeSlot, durationHours)

  return { fitsWorkingHours, windows }
}
