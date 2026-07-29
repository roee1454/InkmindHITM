import React, { useEffect, useState, useRef } from 'react'
import { CalendarCheck2, CalendarX2, AlertTriangle, User, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { getCurrentStaffInfo, type CurrentStaffInfo } from '../server/staff'
import {
  getGoogleCalendarConnections,
  disconnectStaffGoogleCalendar,
} from '@/features/calendar/server/appointments'
import type { ApiGoogleConnection } from '@/features/calendar/types'

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}

interface GoogleCalendarConnectionProps {
  staffId: string
  staffName?: string
  staffRole?: string
  isSelf?: boolean
}

export const GoogleCalendarConnection: React.FC<GoogleCalendarConnectionProps> = ({
  staffId,
  staffName,
  staffRole,
  isSelf,
}) => {
  const queryClient = useQueryClient()

  const { data: currentStaff } = useQuery<CurrentStaffInfo>({
    queryKey: ['current-staff-info'],
    queryFn: () => getCurrentStaffInfo(),
  })
  const canManage = currentStaff?.isAdmin || currentStaff?.id === staffId

  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)

  const { data: googleConnections = [], isLoading } = useQuery<ApiGoogleConnection[]>({
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
    const popup = window.open(
      `/api/staff/${staffId}/google-calendar/connect`,
      'google-calendar-connect',
      'width=500,height=650',
    )
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

  const handleDisconnect = () => {
    if (
      window.confirm(
        'לנתק את היומן? התורים ימשיכו להתנהל ב-CRM, אך לא יסונכרנו יותר עם Google Calendar.',
      )
    ) {
      disconnectMutation.mutate()
    }
  }

  const roleLabel =
    staffRole === 'owner' ? 'בעלים' : staffRole === 'admin' ? 'מנהל' : 'מקעקע/ת'

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/20 font-assistant">
      {/* Header Row: Staff Info + Dynamic Connection Badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary text-xs">
            {staffName ? staffName.slice(0, 2) : <User size={15} />}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <span>{staffName || 'חבר צוות'}</span>
              {isSelf && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  את/ה
                </span>
              )}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">{roleLabel}</div>
          </div>
        </div>

        {/* Dynamic Status Pill */}
        <div>
          {connection?.status === 'connected' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              מחובר
            </span>
          ) : connection?.status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-400">
              <AlertTriangle size={12} />
              שגיאת סנכרון
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              לא מחובר
            </span>
          )}
        </div>
      </div>

      {connectError && (
        <p className="text-xs font-semibold text-rose-400">{connectError}</p>
      )}

      {/* Action / Detail Box */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/50 p-3">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">טוען סטטוס יומן…</p>
        ) : connection?.status === 'connected' ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              {connection.googleAccountPicture ? (
                <img
                  src={connection.googleAccountPicture}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <CalendarCheck2 size={16} className="text-emerald-400 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate" dir="ltr">
                  {connection.googleAccountEmail || 'חשבון מחובר'}
                </div>
                {connection.lastSyncedAt && (
                  <div className="text-[10px] text-muted-foreground">
                    סונכרן: {connection.lastSyncedAt}
                  </div>
                )}
              </div>
            </div>

            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
                className="text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-500 shrink-0"
              >
                {disconnectMutation.isPending ? 'מנתק…' : 'נתק'}
              </Button>
            )}
          </>
        ) : connection?.status === 'error' ? (
          <>
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {connection.lastError || 'שגיאה בהתחברות לחשבון'}
              </span>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleConnect}
                disabled={connecting}
                className="text-xs font-bold shrink-0"
              >
                {connecting ? 'מתחבר…' : 'התחבר מחדש'}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <CalendarX2 size={15} className="text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">אין יומן מחובר</span>
            </div>

            {canManage && (
              <Button
                size="sm"
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 shadow-sm font-bold text-xs rounded-xl px-3.5 py-1.5 transition-all cursor-pointer shrink-0"
              >
                {connecting ? (
                  <RefreshCw size={14} className="animate-spin text-zinc-700" />
                ) : (
                  <GoogleIcon size={15} />
                )}
                <span>{connecting ? 'מתחבר…' : 'חבר יומן Google'}</span>
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default GoogleCalendarConnection
