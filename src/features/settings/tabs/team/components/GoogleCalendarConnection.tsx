import React, { useEffect, useState, useRef } from 'react'
import { AlertTriangle } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { SettingsRow } from '@/features/settings/components/settings-layout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCurrentStaffInfo } from '@/features/settings/server/staff'
import type { CurrentStaffInfo } from '@/features/settings/server/staff'
import {
  getGoogleCalendarConnections,
  disconnectStaffGoogleCalendar,
} from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'
import { useConfirm } from '#/hooks/useConfirm'

export interface GoogleCalendarConnectionProps {
  staffId: string
}

/** One settings row: the connected account (or why it failed) and connect/disconnect. No Google
 *  logo (deliberate — nothing to license or maintain visually). */
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
  const googlePicture = connection?.googleAccountPicture
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [googlePicture])

  const hint = connectError ? (
    <span className="font-bold text-destructive">{connectError}</span>
  ) : isError ? (
    <span className="inline-flex items-center gap-1 text-destructive">
      <AlertTriangle size={12} className="shrink-0" />
      {connection.lastError || 'שגיאת סנכרון'}
    </span>
  ) : isConnected && connection.googleAccountEmail ? (
    <span dir="ltr">{connection.googleAccountEmail}</span>
  ) : (
    'תורים שנקבעים למקעקע נכנסים גם ליומן שלו.'
  )

  return (
    <SettingsRow label="יומן Google" hint={hint}>
      <div className="flex items-center justify-end gap-3">
        {isConnected && googlePicture && !imgError && (
          <img src={googlePicture} alt="" referrerPolicy="no-referrer" onError={() => setImgError(true)} className="size-7 shrink-0 rounded-full border border-border object-cover" />
        )}
        {isConnected ? (
          <>
            <span className="text-sm font-bold text-status-done">מחובר</span>
            {canManage && (
              <Button type="button" variant="ghost" size="sm" onClick={handleDisconnect} disabled={disconnectMutation.isPending}>
                {disconnectMutation.isPending ? 'מנתק…' : 'ניתוק'}
              </Button>
            )}
          </>
        ) : (
          canManage && (
            <Button type="button" variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
              {connecting ? 'מתחבר…' : isError ? 'חיבור מחדש' : 'חיבור'}
            </Button>
          )
        )}
      </div>
    </SettingsRow>
  )
}

export default GoogleCalendarConnection
