import { useEffect, useState } from 'react'
import { DialogActions, ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from '@/components/ui/icon'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import type { ApiAppointment } from '@/features/calendar/types'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import { useCloseSession } from '../hooks/use-close-session'
import { defaultIsLastSession } from '../utils/closing'
import type { NewPayment } from '../types'
import { ClosingPreview } from './ClosingPreview'
import { PaymentRowsEditor } from './PaymentRowsEditor'
import { LastSessionQuestion } from './LastSessionQuestion'
import type { PaymentRowDraft } from './PaymentRowsEditor'

function toNewPayments(rows: PaymentRowDraft[]): NewPayment[] {
  return rows.map((row) => ({ method: row.method, amount: Number(row.amount) })).filter((p) => p.amount > 0)
}

/**
 * Closes a tattoo session: its final price (or "no charge") and the money received on the spot,
 * saved together. Earlier deposits are already recorded and count automatically.
 */
export function CloseSessionDialog({
  appointment,
  open,
  onOpenChange,
  onScheduleNextSession,
}: {
  appointment: ApiAppointment
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, staff can book the next session right after closing this one. */
  onScheduleNextSession?: (session: ApiAppointment) => void
}) {
  const [finalPrice, setFinalPrice] = useState('')
  const [chargeWaived, setChargeWaived] = useState(false)
  const [rows, setRows] = useState<PaymentRowDraft[]>([{ method: 'cash', amount: '' }])
  // null until staff touch it: follows the default computed from the project.
  const [lastSessionChoice, setLastSessionChoice] = useState<boolean | null>(null)
  const [scheduleNext, setScheduleNext] = useState(false)
  const { finance, close } = useCloseSession(appointment.projectId, open, () => onOpenChange(false))
  // null = staff must choose (no estimate and nothing else booked).
  const isLastSession: boolean | null =
    lastSessionChoice ?? (finance.data ? defaultIsLastSession(finance.data.appointments, appointment.id, finance.data.estimatedSessions) : false)
  const offerNextSession = Boolean(onScheduleNextSession) && isLastSession === false

  useEffect(() => {
    if (!open) return
    setFinalPrice('')
    setChargeWaived(appointment.kind === 'touch_up')
    setRows([{ method: 'cash', amount: '' }])
    setLastSessionChoice(null)
    setScheduleNext(false)
    close.reset()
    // Reset only when the dialog opens for an appointment, not on every render of `close`.
  }, [open, appointment.id])

  const price = Number(finalPrice) > 0 ? Number(finalPrice) : null
  const newPayments = toNewPayments(rows)
  const canSubmit = (chargeWaived || price !== null) && isLastSession !== null && !close.isPending

  const submit = () => {
    if (!canSubmit || isLastSession === null) return
    const bookNext = offerNextSession && scheduleNext
    close.mutate(
      { appointmentId: appointment.id, finalPrice: chargeWaived ? null : price, chargeWaived, payments: newPayments, completesProject: isLastSession },
      { onSuccess: () => bookNext && onScheduleNextSession?.(appointment) },
    )
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !close.isPending && onOpenChange(next)}
      title={`סגירת ${appointmentKindLabel(appointment.kind, appointment.projectPosition)} — ${appointment.leadName ?? 'לקוח'}`}
      description="המחיר הסופי והתשלום שהתקבל נשמרים יחד. מקדמות קודמות כבר רשומות ומקוזזות."
      footer={
        <DialogActions>
          <Button type="button" variant="ghost" disabled={close.isPending} onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" form="close-session-form" disabled={!canSubmit} className="min-w-28 gap-2">
            {close.isPending && <Loader2 size={14} className="animate-spin" />}
            סגירת הסשן
          </Button>
        </DialogActions>
      }
    >
      <form
        id="close-session-form"
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="final-price" className="form-label">מחיר סופי</label>
          <Input
            id="final-price"
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="₪"
            value={chargeWaived ? '' : finalPrice}
            disabled={chargeWaived || close.isPending}
            onChange={(event) => setFinalPrice(event.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={chargeWaived} onCheckedChange={setChargeWaived} disabled={close.isPending} />
            ללא חיוב (למשל טאץ'-אפ)
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className="form-label">מה התקבל עכשיו</span>
          <PaymentRowsEditor rows={rows} onChange={setRows} disabled={close.isPending} />
        </div>

        {finance.isLoading && <Skeleton className="h-24 w-full" />}
        {finance.isError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {formatDatabaseError(finance.error, 'לא הצלחנו לטעון את מצב התשלומים של הפרויקט.')}
          </p>
        )}
        {isLastSession === null ? (
          <LastSessionQuestion onChoose={setLastSessionChoice} disabled={close.isPending} />
        ) : (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={isLastSession} onCheckedChange={setLastSessionChoice} disabled={close.isPending || !finance.data} />
            זה הסשן האחרון בפרויקט (הפרויקט יסומן כהושלם)
          </label>
        )}
        {offerNextSession && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={scheduleNext} onCheckedChange={setScheduleNext} disabled={close.isPending} />
            לקבוע עכשיו את הסשן הבא (ייפתח טופס תור באותו פרויקט)
          </label>
        )}

        {finance.data && isLastSession !== null && (
          <ClosingPreview
            finance={finance.data}
            appointmentId={appointment.id}
            finalPrice={price}
            chargeWaived={chargeWaived}
            newPayments={newPayments}
            isLastSession={isLastSession}
            onFillSuggested={(amount) => setRows([{ method: rows[0]?.method ?? 'cash', amount: String(amount) }])}
          />
        )}

        {close.isError && (
          <p className="whitespace-pre-line rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {formatDatabaseError(close.error, 'סגירת הסשן נכשלה.')}
          </p>
        )}

      </form>
    </ResponsiveDialog>
  )
}
