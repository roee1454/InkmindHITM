import { useEffect, useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from '@/components/ui/icon'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { cn } from '@/lib/utils'
import type { ApiAppointment } from '@/features/calendar/types'
import { appointmentKindLabel } from '@/features/calendar/utils/project-position'
import { useCloseSession } from '../hooks/use-close-session'
import { balanceAfterClosing } from '../utils/balance'
import { PAYMENT_KIND_LABELS, formatIls } from '../utils/labels'
import type { NewPayment, ProjectFinance } from '../types'
import { PaymentRowsEditor } from './PaymentRowsEditor'
import type { PaymentRowDraft } from './PaymentRowsEditor'

function toNewPayments(rows: PaymentRowDraft[]): NewPayment[] {
  return rows.map((row) => ({ method: row.method, amount: Number(row.amount) })).filter((p) => p.amount > 0)
}

function PreviewLine({ label, value, emphasis }: { label: string; value: string; emphasis?: 'due' | 'credit' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums text-foreground', emphasis === 'due' && 'text-warning', emphasis === 'credit' && 'text-status-done')}>{value}</span>
    </div>
  )
}

function ClosingPreview({ finance, appointmentId, finalPrice, chargeWaived, newPayments }: {
  finance: ProjectFinance
  appointmentId: string
  finalPrice: number | null
  chargeWaived: boolean
  newPayments: NewPayment[]
}) {
  const earlier = finance.payments.filter((p) => p.status === 'verified')
  const after = balanceAfterClosing(finance.appointments, finance.payments, { appointmentId, finalPrice, chargeWaived, newPayments })
  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3" aria-label="מצב הפרויקט אחרי הסגירה">
      {earlier.map((payment) => (
        <PreviewLine key={payment.id} label={`${PAYMENT_KIND_LABELS[payment.kind]} ששולם/ה קודם`} value={formatIls(payment.amount)} />
      ))}
      <PreviewLine label="סה״כ חיובים בפרויקט" value={formatIls(after.billed)} />
      <PreviewLine label="סה״כ שולם" value={formatIls(after.paid - after.refunded)} />
      {after.due > 0 && <PreviewLine label="יתרה לתשלום" value={formatIls(after.due)} emphasis="due" />}
      {after.credit > 0 && <PreviewLine label="זיכוי לסשנים הבאים" value={formatIls(after.credit)} emphasis="credit" />}
      {after.due === 0 && after.credit === 0 && <PreviewLine label="מצב" value="מאוזן" emphasis="credit" />}
    </section>
  )
}

/**
 * Closes a tattoo session: its final price (or "no charge") and the money received on the spot,
 * saved together. Earlier deposits are already recorded and count automatically.
 */
export function CloseSessionDialog({ appointment, open, onOpenChange }: { appointment: ApiAppointment; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [finalPrice, setFinalPrice] = useState('')
  const [chargeWaived, setChargeWaived] = useState(false)
  const [rows, setRows] = useState<PaymentRowDraft[]>([{ method: 'cash', amount: '' }])
  const { finance, close } = useCloseSession(appointment.projectId, open, () => onOpenChange(false))

  useEffect(() => {
    if (!open) return
    setFinalPrice('')
    setChargeWaived(appointment.kind === 'touch_up')
    setRows([{ method: 'cash', amount: '' }])
    close.reset()
    // Reset only when the dialog opens for an appointment, not on every render of `close`.
  }, [open, appointment.id])

  const price = Number(finalPrice) > 0 ? Number(finalPrice) : null
  const newPayments = toNewPayments(rows)
  const canSubmit = (chargeWaived || price !== null) && !close.isPending

  const submit = () => {
    if (!canSubmit) return
    close.mutate({ appointmentId: appointment.id, finalPrice: chargeWaived ? null : price, chargeWaived, payments: newPayments })
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !close.isPending && onOpenChange(next)}
      title={`סגירת ${appointmentKindLabel(appointment.kind, appointment.projectPosition)} — ${appointment.leadName ?? 'לקוח'}`}
      description="המחיר הסופי והתשלום שהתקבל נשמרים יחד. מקדמות קודמות כבר רשומות ומקוזזות אוטומטית."
    >
      <form
        className="flex flex-col gap-4 font-assistant"
        dir="rtl"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="final-price" className="text-xs font-bold text-foreground">מחיר סופי לסשן</label>
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
          <span className="text-xs font-bold text-foreground">תשלומים שהתקבלו עכשיו</span>
          <PaymentRowsEditor rows={rows} onChange={setRows} disabled={close.isPending} />
        </div>

        {finance.isLoading && <Skeleton className="h-24 w-full" />}
        {finance.isError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {formatDatabaseError(finance.error, 'לא הצלחנו לטעון את מצב התשלומים של הפרויקט.')}
          </p>
        )}
        {finance.data && (
          <ClosingPreview finance={finance.data} appointmentId={appointment.id} finalPrice={price} chargeWaived={chargeWaived} newPayments={newPayments} />
        )}

        {close.isError && (
          <p className="whitespace-pre-line rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {formatDatabaseError(close.error, 'סגירת הסשן נכשלה.')}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" size="sm" disabled={close.isPending} onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" size="sm" disabled={!canSubmit} className="min-w-28 gap-2">
            {close.isPending && <Loader2 size={14} className="animate-spin" />}
            סגירת סשן
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  )
}
