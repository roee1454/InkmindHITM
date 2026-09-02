import { ArrowLeft } from 'lucide-react'

interface AlertBannersProps {
  receiptApprovalCount: number
  awaitingPriceCount: number
  onNavigateToLeads: () => void
}

export function AlertBanners({ receiptApprovalCount, awaitingPriceCount, onNavigateToLeads }: AlertBannersProps) {
  const total = receiptApprovalCount + awaitingPriceCount
  if (total === 0) return null

  let message: string
  if (receiptApprovalCount > 0 && awaitingPriceCount > 0) {
    message = `${total} פניות ממתינות לטיפול שלך`
  } else if (receiptApprovalCount > 0) {
    message = `${receiptApprovalCount} מקדמות ממתינות לאישור קבלה שלך`
  } else {
    message = `${awaitingPriceCount} פניות ממתינות לתמחור שלך`
  }

  return (
    <div
      onClick={onNavigateToLeads}
      className="group flex cursor-pointer select-none items-center justify-between rounded-2xl border border-primary/25 bg-primary/10 px-5 py-3.5 shadow-2xs transition-all duration-150 ease-native hover:bg-primary/15 hover:border-primary/40 active:scale-[0.99] md:rounded-3xl"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
        <span className="text-[14.5px] font-bold text-foreground">{message}</span>
      </div>
      <div className="flex items-center gap-1 text-[13px] font-extrabold text-primary transition-transform group-hover:translate-x-[-2px]">
        <span>לטיפול</span>
        <ArrowLeft size={16} />
      </div>
    </div>
  )
}
export default AlertBanners
