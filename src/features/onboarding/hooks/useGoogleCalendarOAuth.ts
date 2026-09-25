import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getGoogleCalendarConnections } from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { useOnboardingUiStore } from '../store/onboardingUiStore'

export function useGoogleCalendarOAuth(staffId?: string) {
  const queryClient = useQueryClient()
  const popupRef = useRef<Window | null>(null)

  const connectingCalendar = useOnboardingUiStore((s) => s.connectingCalendar)
  const calendarError = useOnboardingUiStore((s) => s.calendarError)
  const setConnectingCalendar = useOnboardingUiStore((s) => s.setConnectingCalendar)
  const setCalendarError = useOnboardingUiStore((s) => s.setCalendarError)

  const { data: googleConnections = [] } = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
    enabled: Boolean(staffId),
  })

  const isCalendarConnected = Boolean(
    staffId && googleConnections.some((c) => c.staffId === staffId && c.status === 'connected')
  )

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== popupRef.current) return
      if (event.data?.type !== 'google-calendar-oauth-result') return
      setConnectingCalendar(false)
      if (event.data.success) {
        setCalendarError(null)
        queryClient.invalidateQueries({ queryKey: ['google-calendar-connections'] })
      } else {
        setCalendarError(event.data.error || 'שגיאה בחיבור ליומן Google')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [queryClient, setCalendarError, setConnectingCalendar])

  const handleConnectGoogle = () => {
    if (!staffId) return
    setCalendarError(null)
    setConnectingCalendar(true)
    const popup = window.open(
      `/api/staff/${staffId}/google-calendar/connect`,
      'google-calendar-connect',
      'width=500,height=650',
    )
    popupRef.current = popup
  }

  return {
    isCalendarConnected,
    connectingCalendar,
    calendarError,
    handleConnectGoogle,
  }
}

