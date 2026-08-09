import React from 'react'
import { Users, UserCheck, Star } from 'lucide-react'

interface CustomersSummaryProps {
  totalCustomers: number
  returningCustomers: number
  reviewsCount: number
}

export const CustomersSummary: React.FC<CustomersSummaryProps> = ({
  totalCustomers,
  returningCustomers,
  reviewsCount,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4 font-assistant" dir="rtl">
      {/* Card 1: סה"כ לקוחות */}
      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-3 shadow-sm md:h-28 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">סה"כ לקוחות במאגר</span>
          <Users size={16} className="text-primary" />
        </div>
        <div className="text-xl font-bold text-foreground md:text-3xl">{totalCustomers}</div>
      </div>

      {/* Card 2: לקוחות חוזרים */}
      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-3 shadow-sm md:h-28 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">לקוחות חוזרים</span>
          <UserCheck size={16} className="text-indigo-400" />
        </div>
        <div className="text-xl font-bold text-foreground md:text-3xl">{returningCustomers}</div>
      </div>

      {/* Card 3: ביקורים ודירוגים */}
      <div className="flex h-24 flex-col justify-between rounded-2xl border border-border bg-card p-3 shadow-sm md:h-28 md:p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-muted-foreground">דירוגים וביקורים</span>
          <Star size={16} className="text-amber-400 fill-amber-400" />
        </div>
        <div className="text-xl font-bold text-foreground md:text-3xl">{reviewsCount}</div>
      </div>
    </div>
  )
}

export default CustomersSummary
