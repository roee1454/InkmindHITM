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
      className="flex h-13 shrink-0 cursor-pointer select-none items-center justify-between rounded-2xl bg-primary px-5 shadow-md transition-transform duration-150 ease-native active:scale-[0.98] md:h-14"
    >
      <span className="text-[15px] font-bold text-primary-foreground">{message}</span>
      <ArrowLeft size={18} className="shrink-0 text-primary-foreground" />
    </div>
  )
}
export default AlertBanners
