import { StatStrip } from '@/components/StatStrip'
import { cn } from '@/lib/utils'
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatIls } from '@/features/payments/utils/labels'
import type { PaymentStatus } from '@/features/payments/types'
import type { CustomerOverview } from '../../types'

const STATUS_TONE: Record<Exclude<PaymentStatus, 'verified'>, string> = {
  pending_verification: 'bg-status-wait-soft text-status-wait',
  rejected: 'bg-destructive/10 text-destructive',
  voided: 'bg-status-dead-soft text-status-dead',
}

function formatDay(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

/** Everything the customer paid or was refunded, across all their pieces (documents come with A16). */
export function CustomerPaymentsTab({ overview }: { overview: CustomerOverview }) {
  const { totals, payments } = overview

  return (
    <div className="flex flex-col gap-4">
      <StatStrip
        stats={[
          { label: 'שולם', value: formatIls(totals.paid) },
          { label: 'יתרה לתשלום', value: formatIls(totals.due) },
          { label: 'זיכוי', value: formatIls(totals.credit) },
        ]}
      />

      {totals.awaitingVerification > 0 && (
        <p className="rounded-lg bg-status-wait-soft px-3 py-2 text-xs font-bold text-status-wait">
          {totals.awaitingVerification === 1 ? 'קבלה אחת ממתינה לאישור' : `${totals.awaitingVerification} קבלות ממתינות לאישור`} — הן לא נספרות עד שמאשרים אותן.
        </p>
      )}

      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">עדיין לא נרשמו תשלומים.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {payments.map((payment) => {
            // Verified money is counted; a pending receipt isn't yet; a rejected or voided one never will be.
            const amountTone =
              payment.status === 'verified'
                ? payment.kind === 'refund' ? 'text-destructive' : 'text-foreground'
                : payment.status === 'pending_verification' ? 'text-muted-foreground' : 'text-muted-foreground line-through'
            return (
              <li key={payment.id} className="flex items-center gap-3 bg-card px-3.5 py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-extrabold text-foreground">{PAYMENT_KIND_LABELS[payment.kind]}</span>
                    <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</span>
                    {payment.status !== 'verified' && (
                      <span className={cn('rounded-full px-2 py-0.5 text-2xs font-bold', STATUS_TONE[payment.status])}>{PAYMENT_STATUS_LABELS[payment.status]}</span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {payment.projectTitle} · {formatDay(payment.receivedAt ?? payment.createdAt)}
                  </span>
                </span>
                <span
                  dir="ltr"
                  className={cn('shrink-0 text-sm font-extrabold tabular-nums', amountTone)}
                >
                  {payment.kind === 'refund' ? '−' : ''}
                  {formatIls(payment.amount)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
