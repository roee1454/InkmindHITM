import { useState } from 'react'
import { ArrowsClockwise, CalendarCheck, CalendarX } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/ToastProvider'
import { cn } from '@/lib/utils'
import { retrySyncAppointmentToGoogle } from '../../server/appointments'
import { STATUS_LABELS } from '../../types'
import type { ApiAppointment, AppointmentFormValues, AppointmentStatus } from '../../types'
import { BotQuoteBanner } from '../BotQuoteBanner'
import type { QuoteToSend } from '../BotQuoteBanner'

interface AppointmentPricingTabProps {
  values: AppointmentFormValues
  onChange: (patch: Partial<AppointmentFormValues>) => void
  appointment?: ApiAppointment | null
  isEdit: boolean
  readOnly: boolean
  onSendQuote?: (quote: QuoteToSend) => void
  isSendingQuote: boolean
}

function amount(value: string): number | null {
  return value === '' ? null : Number(value)
}

/** Whether a confirmed appointment reached the artist's Google Calendar, and a retry when it didn't. */
function GoogleSyncRow({ appointment, readOnly }: { appointment: ApiAppointment; readOnly: boolean }) {
  const { toast } = useToast()
  const [status, setStatus] = useState(appointment.googleSyncStatus)
  const [retrying, setRetrying] = useState(false)

  const retry = async () => {
    setRetrying(true)
    try {
      const res = await retrySyncAppointmentToGoogle({ data: { appointmentId: appointment.id } })
      setStatus(res.ok ? 'synced' : 'push_failed')
      if (res.ok) toast('סנכרון יומן', 'התור סונכרן ל-Google Calendar.', 'success')
      else toast('שגיאת סנכרון', 'הסנכרון נכשל. ודאו שהמקעקע חיבר יומן Google.', 'warning')
    } catch {
      toast('שגיאה', 'הסנכרון נכשל באופן לא צפוי.', 'error')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">יומן Google</span>
        {status === 'synced' ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-status-done">
            <CalendarCheck size={13} />
            מסונכרן
          </span>
        ) : status === 'push_failed' ? (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive">
            <CalendarX size={13} />
            הסנכרון נכשל
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">עוד לא סונכרן</span>
        )}
      </div>
      {status === 'push_failed' && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">אולי היומן של המקעקע לא מחובר, או שפג תוקף החיבור.</p>
          <Button type="button" variant="outline" size="sm" disabled={retrying || readOnly} onClick={retry} className="shrink-0 gap-1.5">
            <ArrowsClockwise size={13} className={cn(retrying && 'animate-spin')} />
            {retrying ? 'מסנכרן…' : 'ניסיון חוזר'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** The price, the deposit, and where the appointment stands. */
export function AppointmentPricingTab({ values, onChange, appointment, isEdit, readOnly, onSendQuote, isSendingQuote }: AppointmentPricingTabProps) {
  const isSketch = values.type === 'sketch'
  // A session is completed by closing it with its final price, not from the status list.
  const closesViaCloseOut = Boolean(isEdit && appointment && appointment.kind !== 'consultation' && appointment.status !== 'completed')

  return (
    <div className="form-stack">
      {isSketch ? (
        <p className="text-sm text-muted-foreground">בפגישת סקיצה לא קובעים מחיר מראש — הוא נקבע בפגישה. מקדמה לשריון, אם נגבתה, מקוזזת מהקעקוע.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price-min" className="form-label">
              מחיר מ- (₪)
            </label>
            <Input id="price-min" type="number" min="0" inputMode="numeric" disabled={readOnly} value={values.priceMinIls ?? ''} onChange={(e) => onChange({ priceMinIls: amount(e.target.value) })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="price-max" className="form-label">
              עד (₪)
            </label>
            <Input id="price-max" type="number" min="0" inputMode="numeric" disabled={readOnly} value={values.priceMaxIls ?? ''} onChange={(e) => onChange({ priceMaxIls: amount(e.target.value) })} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="deposit" className="form-label">
          {isSketch ? 'מקדמה לשריון (₪)' : 'מקדמה (₪)'}
        </label>
        <Input id="deposit" type="number" min="0" inputMode="numeric" disabled={readOnly} value={values.depositAmount ?? ''} onChange={(e) => onChange({ depositAmount: amount(e.target.value) })} />
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex flex-col">
          <span className="text-sm font-bold text-foreground">המקדמה שולמה</span>
          <span className="text-xs text-muted-foreground">במלואה</span>
        </span>
        <Switch disabled={readOnly} checked={values.depositPaid} onCheckedChange={(checked) => onChange({ depositPaid: checked })} />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="form-label">סטטוס</span>
        <Select dir="rtl" disabled={readOnly} value={values.status} onValueChange={(v) => onChange({ status: v as AppointmentStatus })}>
          <SelectTrigger className="w-full" aria-label="סטטוס">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" dir="rtl">
            {Object.entries(STATUS_LABELS).map(([key, label]) => {
              const viaCloseOut = key === 'completed' && closesViaCloseOut
              return (
                <SelectItem key={key} value={key} disabled={viaCloseOut}>
                  {viaCloseOut ? `${label} (דרך "סגירת סשן")` : label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {values.status === 'confirmed' && isEdit && appointment && <GoogleSyncRow appointment={appointment} readOnly={readOnly} />}

      {appointment?.source === 'ai_bot' && appointment.status === 'pending' && onSendQuote && (
        <BotQuoteBanner values={values} readOnly={readOnly} isSending={isSendingQuote} onSend={onSendQuote} />
      )}
    </div>
  )
}
