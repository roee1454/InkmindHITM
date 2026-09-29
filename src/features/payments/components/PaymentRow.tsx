import { cn } from '@/lib/utils'
import { StatusLabel } from '@/components/ui/status-label'
import type { StatusRole } from '@/components/ui/status-label'
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatIls } from '../utils/labels'
import type { LedgerPayment, PaymentStatus } from '../types'

const STATUS_ROLE: Record<Exclude<PaymentStatus, 'verified'>, StatusRole> = {
  pending_verification: 'wait',
  rejected: 'danger',
  voided: 'dead',
}

// Verified money is counted; a pending receipt isn't yet; a rejected or voided one never will be.
function amountTone(payment: LedgerPayment): string {
  if (payment.status === 'verified') return payment.kind === 'refund' ? 'text-destructive' : 'text-foreground'
  return payment.status === 'pending_verification' ? 'text-muted-foreground' : 'text-muted-foreground line-through'
}

/** One ledger line: what kind of money, how it came in, its state, and the amount. */
export function PaymentRow({ payment, detail }: { payment: LedgerPayment; detail: string }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-extrabold text-foreground">{PAYMENT_KIND_LABELS[payment.kind]}</span>
          <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</span>
          {payment.status !== 'verified' && (
            <StatusLabel role={STATUS_ROLE[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusLabel>
          )}
        </span>
        {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
      <span dir="ltr" className={cn('shrink-0 text-sm font-extrabold tabular-nums', amountTone(payment))}>
        {payment.kind === 'refund' ? '−' : ''}
        {formatIls(payment.amount)}
      </span>
    </li>
  )
}
