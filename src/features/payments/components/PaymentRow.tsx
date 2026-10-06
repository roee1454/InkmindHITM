import { cn } from '@/lib/utils'
import { StatusLabel } from '@/components/ui/status-label'
import type { StatusRole } from '@/components/ui/status-label'
import { Bank, ChevronLeft, Coins, CreditCard, Wallet } from '@/components/ui/icon'
import { PAYMENT_KIND_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatIls } from '../utils/labels'
import type { LedgerPayment, PaymentMethod, PaymentStatus } from '../types'

const STATUS_ROLE: Record<Exclude<PaymentStatus, 'verified'>, StatusRole> = {
  pending_verification: 'wait',
  rejected: 'danger',
  voided: 'dead',
}

const METHOD_ICONS: Record<PaymentMethod, React.ComponentType<{ size?: number; className?: string }>> = {
  cash: Coins,
  credit_card: CreditCard,
  bank_transfer: Bank,
  bit: Wallet,
  paybox: Wallet,
  other: Wallet,
}

// Verified money is counted; a pending receipt isn't yet; a rejected or voided one never will be.
function amountTone(payment: LedgerPayment): string {
  if (payment.status === 'verified') return payment.kind === 'refund' ? 'text-destructive' : 'text-foreground'
  return payment.status === 'pending_verification' ? 'text-muted-foreground' : 'text-muted-foreground line-through'
}

/** One ledger line: what kind of money, how it came in, its state, and the amount. */
export function PaymentRow({
  payment,
  detail,
  onSelectAppointment,
}: {
  payment: LedgerPayment
  detail: string
  onSelectAppointment?: (appointmentId: string) => void
}) {
  const MethodIcon = METHOD_ICONS[payment.method] || Wallet
  const canClick = Boolean(payment.appointmentId && onSelectAppointment)

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3.5 py-3 transition-colors',
        canClick && 'cursor-pointer hover:bg-muted/40 group',
      )}
      onClick={() => {
        if (payment.appointmentId && onSelectAppointment) {
          onSelectAppointment(payment.appointmentId)
        }
      }}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/40 text-muted-foreground">
        <MethodIcon size={14} />
      </div>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-extrabold text-foreground">{PAYMENT_KIND_LABELS[payment.kind]}</span>
          <span className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</span>
          {payment.status !== 'verified' && (
            <StatusLabel role={STATUS_ROLE[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusLabel>
          )}
        </span>
        {detail && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{detail}</span>
            {canClick && (
              <ChevronLeft size={11} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
            )}
          </span>
        )}
      </span>

      <span dir="ltr" className={cn('shrink-0 text-sm font-extrabold tabular-nums ms-auto', amountTone(payment))}>
        {payment.kind === 'refund' ? '−' : ''}
        {formatIls(payment.amount)}
      </span>
    </li>
  )
}
