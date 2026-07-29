import { ArrowLeft } from 'lucide-react'

interface AlertBannersProps {
  receiptApprovalCount: number
  awaitingPriceCount: number
  onNavigateToLeads: () => void
}

export function AlertBanners({ receiptApprovalCount, awaitingPriceCount, onNavigateToLeads }: AlertBannersProps) {
  if (receiptApprovalCount === 0 && awaitingPriceCount === 0) return null

  return (
    <div className="space-y-3">
      {receiptApprovalCount > 0 && (
        <div
          onClick={onNavigateToLeads}
          className="flex cursor-pointer items-center justify-between rounded-xl bg-amber-500 px-5 py-3 font-assistant text-xs font-bold text-black transition-colors hover:bg-amber-500/90"
        >
          <span>{receiptApprovalCount} מקדמות ממתינות לאישור קבלה שלך</span>
          <ArrowLeft size={16} />
        </div>
      )}

      {awaitingPriceCount > 0 && (
        <div
          onClick={onNavigateToLeads}
          className="flex cursor-pointer items-center justify-between rounded-xl bg-primary px-5 py-3 font-assistant text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span>{awaitingPriceCount} פניות ממתינות לתמחור שלך</span>
          <ArrowLeft size={16} />
        </div>
      )}
    </div>
  )
}
export default AlertBanners
