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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-assistant" dir="rtl">
      {/* Card 1: סה"כ לקוחות */}
      <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">סה"כ לקוחות במאגר</span>
          <Users size={16} className="text-primary" />
        </div>
        <div className="text-3xl font-bold text-foreground">{totalCustomers}</div>
      </div>

      {/* Card 2: לקוחות חוזרים */}
      <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">לקוחות חוזרים</span>
          <UserCheck size={16} className="text-indigo-400" />
        </div>
        <div className="text-3xl font-bold text-foreground">{returningCustomers}</div>
      </div>

      {/* Card 3: ביקורים ודירוגים */}
      <div className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">דירוגים וביקורים</span>
          <Star size={16} className="text-amber-400 fill-amber-400" />
        </div>
        <div className="text-3xl font-bold text-foreground">{reviewsCount}</div>
      </div>
    </div>
  )
}

export default CustomersSummary
