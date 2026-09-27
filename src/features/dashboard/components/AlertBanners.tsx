import { ArrowLeft } from '@/components/ui/icon'

interface AlertBannersProps {
  receiptApprovalCount: number
  awaitingPriceCount: number
  /** Both actions happen in the conversation thread's approval rows, so both lead there. */
  onOpenConversations: () => void
}

/**
 * The things waiting on a human, one row each so staff see what kind of work it is — a single
 * "N items need you" line used to hide whether it was money to confirm or a price to give.
 */
export function AlertBanners({ receiptApprovalCount, awaitingPriceCount, onOpenConversations }: AlertBannersProps) {
  const alerts = [
    receiptApprovalCount > 0 && {
      key: 'receipt',
      text: receiptApprovalCount === 1 ? 'אסמכתת העברה אחת ממתינה לאישור שלך' : `${receiptApprovalCount} אסמכתאות העברה ממתינות לאישור שלך`,
    },
    awaitingPriceCount > 0 && {
      key: 'price',
      text: awaitingPriceCount === 1 ? 'לקוח אחד ממתין להצעת מחיר' : `${awaitingPriceCount} לקוחות ממתינים להצעת מחיר`,
    },
  ].filter((a): a is { key: string; text: string } => Boolean(a))

  if (alerts.length === 0) return null

  return (
    <div className="card-native divide-y divide-border overflow-hidden font-assistant" dir="rtl">
      {alerts.map((alert) => (
        <button
          key={alert.key}
          type="button"
          onClick={onOpenConversations}
          className="group flex w-full cursor-pointer select-none items-center justify-between gap-3 px-5 py-3.5 text-right transition-colors duration-150 hover:bg-muted/50 active:bg-muted"
        >
          <span className="flex items-center gap-3">
            <span className="size-2 shrink-0 rounded-full bg-warning" />
            <span className="text-sm font-bold text-foreground">{alert.text}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-accent-ink">
            לטיפול
            <ArrowLeft size={16} />
          </span>
        </button>
      ))}
    </div>
  )
}

export default AlertBanners
