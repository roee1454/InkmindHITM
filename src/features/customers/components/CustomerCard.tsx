import React from 'react'
import { ChevronLeft, Star } from 'lucide-react'
import type { Customer } from '../types'

interface CustomerCardProps {
  customer: Customer
  onEdit: (customer: Customer) => void
}

export const CustomerCard: React.FC<CustomerCardProps> = ({ customer: c, onEdit }) => {
  const displayName = c.name || 'לקוח ללא שם'
  const initial = displayName.charAt(0)

  return (
    <div onClick={() => onEdit(c)} className="row-native cursor-pointer" dir="rtl">
      <div className="avatar-native">{initial}</div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h4 className="truncate text-[15.5px] font-bold text-foreground">{displayName}</h4>
          {c.isVip && <Star size={13} className="shrink-0 fill-amber-400 text-amber-400" />}
        </div>
        <span className="block truncate text-[13px] text-muted-foreground">
          ₪{c.totalSpend.toLocaleString()} • {c.visits} ביקורים
        </span>
      </div>
      <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
    </div>
  )
}

export default CustomerCard