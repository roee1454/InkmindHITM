import React, { useEffect, useState, useRef } from 'react'
import { CalendarDays, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCurrentStaffInfo, type CurrentStaffInfo } from '../server/staff'
import {
  getGoogleCalendarConnections,
  disconnectStaffGoogleCalendar,
} from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { useConfirm } from '@/hooks/use-confirm'

interface GoogleCalendarConnectionProps {
  staffId: string
}

/** One quiet row — icon chip, label, account email, status dot, connect/disconnect. No Google
 *  logo, no gradient, no large card (deliberate — nothing to license or maintain visually). */
export const GoogleCalendarConnection: React.FC<GoogleCalendarConnectionProps> = ({ staffId }) => {
  const queryClient = useQueryClient()
  const confirm = useConfirm()

  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['current-staff-info'],
    queryFn: () => getCurrentStaffInfo(),
  })
  const canManage = currentStaff?.isAdmin || currentStaff?.id === staffId

  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)

  const { data: googleConnections = [] } = useQuery<ApiGoogleConnection[]>({
    queryKey: ['google-calendar-connections'],
    queryFn: () => getGoogleCalendarConnections(),
  })

  const connection = googleConnections.find((c) => c.staffId === staffId)

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectStaffGoogleCalendar({ data: { staffId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-connections'] })
      queryClient.invalidateQueries({ queryKey: ['staff-list'] })
    },
  })

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== popupRef.current) return
      if (event.data?.type !== 'google-calendar-oauth-result') return
      setConnecting(false)
      if (event.data.success) {
        setConnectError(null)
        queryClient.invalidateQueries({ queryKey: ['google-calendar-connections'] })
        queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      } else {
        setConnectError(event.data.error || 'שגיאה בחיבור ליומן Google')
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [staffId, queryClient])

  const handleConnect = () => {
    setConnectError(null)
    setConnecting(true)
    const popup = window.open(`/api/staff/${staffId}/google-calendar/connect`, 'google-calendar-connect', 'width=500,height=650')
    popupRef.current = popup
    const pollClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollClosed)
        setConnecting(false)
        queryClient.invalidateQueries({ queryKey: ['google-calendar-connections'] })
        queryClient.invalidateQueries({ queryKey: ['staff-list'] })
      }
    }, 500)
  }

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: 'ניתוק יומן Google',
      description: 'התורים ימשיכו להתנהל ב-CRM, אך לא יסונכרנו יותר עם Google Calendar.',
      confirmLabel: 'נתק',
      variant: 'destructive',
    })
    if (ok) disconnectMutation.mutate()
  }

  const isConnected = connection?.status === 'connected'
  const isError = connection?.status === 'error'

  return (
    <div className="flex flex-col gap-1.5 font-assistant">
      <div className="flex items-center gap-3 rounded-2xl bg-background px-3.5 py-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CalendarDays size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-extrabold text-foreground">Google Calendar</div>
          {isConnected && connection.googleAccountEmail && (
            <div dir="ltr" className="truncate text-end text-[12.5px] text-muted-foreground">
              {connection.googleAccountEmail}
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-1 text-[12.5px] text-destructive">
              <AlertTriangle size={12} className="shrink-0" />
              {connection.lastError || 'שגיאת סנכרון'}
            </div>
          )}
        </div>
        {isConnected ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-success">
              <span className="size-2 rounded-full bg-success" />
              מחובר
            </span>
            {canManage && (
              <button type="button" onClick={handleDisconnect} disabled={disconnectMutation.isPending} className="cursor-pointer text-[13px] font-bold text-muted-foreground">
                {disconnectMutation.isPending ? 'מנתק…' : 'נתק'}
              </button>
            )}
          </div>
        ) : (
          canManage && (
            <button type="button" onClick={handleConnect} disabled={connecting} className="shrink-0 cursor-pointer text-[13px] font-extrabold text-primary">
              {connecting ? 'מתחבר…' : isError ? 'התחבר מחדש' : 'חבר יומן'}
            </button>
          )
        )}
      </div>
      {connectError && <p className="px-1 text-[12.5px] font-bold text-destructive">{connectError}</p>}
    </div>
  )
}

export default GoogleCalendarConnection
