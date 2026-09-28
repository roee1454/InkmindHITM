import { StatStrip } from '@/components/StatStrip'
import { formatIls, formatPaymentDay } from '@/features/payments/utils/labels'
import { PaymentRow } from '@/features/payments/components/PaymentRow'
import type { CustomerOverview } from '../../types'

/** Everything the customer paid or was refunded, across all their pieces (documents come with A16). */
export function CustomerPaymentsTab({ overview }: { overview: CustomerOverview }) {
  const { totals, payments } = overview

  return (
    <div className="flex flex-col gap-4">
      <StatStrip
        stats={[
          { label: 'שולם', value: formatIls(totals.paid) },
          { label: 'יתרה לתשלום', value: formatIls(totals.due), valueClassName: totals.due > 0 ? 'text-warning' : undefined },
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
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {payments.map((payment) => (
            <PaymentRow key={payment.id} payment={payment} detail={`${payment.projectTitle} · ${formatPaymentDay(payment.receivedAt ?? payment.createdAt)}`} />
          ))}
        </ul>
      )}
    </div>
  )
}
