import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { balanceAfterClosing } from '../utils/balance'
import { suggestedCollection } from '../utils/closing'
import { PAYMENT_KIND_LABELS, formatIls } from '../utils/labels'
import type { NewPayment, ProjectFinance } from '../types'

function PreviewLine({ label, value, emphasis }: { label: string; value: string; emphasis?: 'due' | 'credit' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold tabular-nums text-foreground', emphasis === 'due' && 'text-warning', emphasis === 'credit' && 'text-status-done')}>{value}</span>
    </div>
  )
}

interface ClosingPreviewProps {
  finance: ProjectFinance
  appointmentId: string
  finalPrice: number | null
  chargeWaived: boolean
  newPayments: NewPayment[]
  isLastSession: boolean
  onFillSuggested: (amount: number) => void
}

/** "How much to take now" with a one-tap fill, then the project's money after this close-out. */
export function ClosingPreview({ finance, appointmentId, finalPrice, chargeWaived, newPayments, isLastSession, onFillSuggested }: ClosingPreviewProps) {
  const earlier = finance.payments.filter((p) => p.status === 'verified')
  const after = balanceAfterClosing(finance.appointments, finance.payments, { appointmentId, finalPrice, chargeWaived, newPayments })
  const suggested = suggestedCollection({
    balanceBefore: finance.balance,
    price: finalPrice,
    chargeWaived,
    depositApplication: finance.depositApplication,
    isLastSession,
  })
  const keepsCredit = finance.depositApplication === 'last_session' && !isLastSession && finance.balance.credit > 0

  return (
    <section className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/30 p-3" aria-label="מצב הפרויקט אחרי הסגירה">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-foreground">לגבייה עכשיו: {formatIls(suggested)}</span>
          {keepsCredit && <span className="text-2xs text-muted-foreground">המקדמה נשמרת לסשן האחרון, לפי מדיניות הסטודיו.</span>}
        </div>
        <Button type="button" variant="outline" size="sm" disabled={suggested === 0} onClick={() => onFillSuggested(suggested)}>
          מילוי
        </Button>
      </div>
      {earlier.map((payment) => (
        <PreviewLine key={payment.id} label={`${PAYMENT_KIND_LABELS[payment.kind]} ששולם/ה קודם`} value={formatIls(payment.amount)} />
      ))}
      <PreviewLine label="סה״כ חיובים בפרויקט" value={formatIls(after.billed)} />
      <PreviewLine label="סה״כ שולם" value={formatIls(after.paid - after.refunded)} />
      {after.due > 0 && <PreviewLine label="יתרה לתשלום" value={formatIls(after.due)} emphasis="due" />}
      {after.credit > 0 && <PreviewLine label="זיכוי לסשנים הבאים" value={formatIls(after.credit)} emphasis="credit" />}
      {after.due === 0 && after.credit === 0 && <PreviewLine label="מצב" value="מאוזן" emphasis="credit" />}
      {isLastSession && <ProjectSummary finance={finance} billed={after.billed} />}
    </section>
  )
}

/** Shown when this session finishes the piece: the whole project against its quote. */
function ProjectSummary({ finance, billed }: { finance: ProjectFinance; billed: number }) {
  const sessions = finance.appointments.filter((a) => a.kind === 'session' && (a.status === 'completed' || a.status === 'confirmed')).length
  const quote =
    finance.quoteMin !== null && finance.quoteMax !== null
      ? finance.quoteMin === finance.quoteMax
        ? formatIls(finance.quoteMin)
        : `${formatIls(finance.quoteMin)}–${formatIls(finance.quoteMax)}`
      : null
  return (
    <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
      <span className="text-xs font-bold text-foreground">סיכום הפרויקט</span>
      <PreviewLine label="סשנים" value={String(sessions)} />
      {quote && <PreviewLine label="הצעת המחיר" value={quote} />}
      <PreviewLine label="סה״כ חויב" value={formatIls(billed)} />
    </div>
  )
}
