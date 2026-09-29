import { formatPaymentDay } from '@/features/payments/utils/labels'
import { PaymentRow } from '@/features/payments/components/PaymentRow'
import type { CustomerOverview } from '../../types'

/** Everything the customer paid or was refunded, across all their pieces (the totals are in the sheet's header). */
export function CustomerPaymentsTab({ overview }: { overview: CustomerOverview }) {
  const { totals, payments } = overview

  return (
    <div className="flex flex-col gap-3">
      {totals.awaitingVerification > 0 && (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent-ink" />
          {totals.awaitingVerification === 1 ? 'קבלה אחת ממתינה לאישור' : `${totals.awaitingVerification} קבלות ממתינות לאישור`}, והן לא נספרות עד שמאשרים אותן.
        </p>
      )}

      {payments.length === 0 ? (
        <div className="flex flex-col gap-1 py-6">
          <p className="text-sm font-bold text-foreground">עדיין לא נרשמו תשלומים</p>
          <p className="text-sm text-muted-foreground">מקדמות ותשלומים על סשנים יופיעו כאן.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border/70">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} detail={`${payment.projectTitle} · ${formatPaymentDay(payment.receivedAt ?? payment.createdAt)}`} />
          ))}
        </ul>
      )}
    </div>
  )
}
