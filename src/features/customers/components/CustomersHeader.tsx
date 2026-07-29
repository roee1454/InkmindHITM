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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-assistant" dir="rtl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">מאגר לקוחות</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {totalCustomers} לקוחות • ₪{totalSpend.toLocaleString()} סה"כ הכנסות
        </p>
      </div>
      <Button
        onClick={onNewCustomer}
        className="flex items-center gap-1.5 font-bold cursor-pointer shrink-0"
      >
        <Plus size={16} /> לקוח חדש
      </Button>
    </div>
  )
}

export default CustomersHeader
