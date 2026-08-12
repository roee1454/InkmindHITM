import React from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomersHeaderProps {
  totalCustomers: number
  totalSpend: number
  onNewCustomer: () => void
}

export const CustomersHeader: React.FC<CustomersHeaderProps> = ({
  totalCustomers,
  totalSpend,
  onNewCustomer,
}) => {
  return (
    <div className="hidden items-center justify-between gap-3 lg:flex" dir="rtl">
      <div className="page-head">
        <h1>מאגר לקוחות</h1>
        <p>
          {totalCustomers} לקוחות • ₪{totalSpend.toLocaleString()} סה"כ הכנסות
        </p>
      </div>
      <Button onClick={onNewCustomer} className="shrink-0 gap-1.5">
        <Plus size={16} /> לקוח חדש
      </Button>
    </div>
  )
}

export default CustomersHeader
