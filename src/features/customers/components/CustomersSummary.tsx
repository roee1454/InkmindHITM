import React from 'react'

interface CustomersSummaryProps {
  totalCustomers: number
  returningOnly: boolean
  onToggleReturning: () => void
}

export const CustomersSummary: React.FC<CustomersSummaryProps> = ({
  totalCustomers,
  returningOnly,
  onToggleReturning,
}) => {
  return (
    <div className="flex items-center gap-3 px-1 font-assistant" dir="rtl">
      <span className="text-[13px] font-extrabold text-muted-foreground">{totalCustomers} לקוחות</span>
      <button
        type="button"
        onClick={onToggleReturning}
        className={`cursor-pointer text-[13px] font-bold ${returningOnly ? 'text-primary underline' : 'text-primary'}`}
      >
        חוזרים בלבד
      </button>
    </div>
  )
}

export default CustomersSummary
