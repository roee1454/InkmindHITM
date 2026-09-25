import React from 'react'
import { ChevronLeft, FileCheck, Star, AlertTriangle } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import type { Customer } from '../types'
import { CUSTOMER_LIFECYCLE_LABELS, CUSTOMER_LIFECYCLE_TONE } from '../utils/lifecycle'
import { extractMedicalAlerts } from '@/features/health-declaration/utils/health-alerts'
import { isHealthDeclarationValid } from '@/features/health-declaration/utils/validity'

interface CustomerCardProps {
  customer: Customer
  onEdit: (customer: Customer) => void
}

export const CustomerCard = React.memo<CustomerCardProps>(({ customer: c, onEdit }) => {
  const displayName = c.name || 'לקוח ללא שם'
  const isExpired = Boolean(
    c.healthDeclarationSigned &&
    c.healthDeclarationDate &&
    !isHealthDeclarationValid(c.healthDeclarationDate)
  )
  const alerts = c.healthDeclarationSigned
    ? extractMedicalAlerts({
        answers: c.healthDeclarationAnswers,
        medicalNotes: c.medicalNotes,
        allergies: c.allergies,
      })
    : []

  return (
    <div onClick={() => onEdit(c)} className="row-native cursor-pointer justify-between" dir="rtl">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h4 className="truncate text-base font-bold text-foreground">{displayName}</h4>
          <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-2xs font-bold', CUSTOMER_LIFECYCLE_TONE[c.lifecycle])}>
            {CUSTOMER_LIFECYCLE_LABELS[c.lifecycle]}
          </span>
          {c.isVip && <Star size={13} className="shrink-0 fill-warning text-warning" />}
          {c.healthDeclarationSigned && (
            <span
              title={
                alerts.length > 0
                  ? `הצהרת בריאות חתומה — ${alerts.length} התראות רפואיות!`
                  : isExpired
                    ? 'הצהרת בריאות פגת תוקף — נדרש חידוש'
                    : 'הצהרת בריאות חתומה ומאושרת'
              }
              className="inline-flex items-center"
            >
              {alerts.length > 0 ? (
                <AlertTriangle size={13} className="shrink-0 text-destructive" />
              ) : isExpired ? (
                <AlertTriangle size={13} className="shrink-0 text-warning" />
              ) : (
                <FileCheck size={13} className="shrink-0 text-status-done" />
              )}
            </span>
          )}
        </div>
        <span className="block truncate text-sm text-muted-foreground">
          ₪{c.totalSpend.toLocaleString()} • {c.visits} ביקורים
        </span>
      </div>
      <ChevronLeft size={18} className="shrink-0 text-muted-foreground" />
    </div>
  )
})
CustomerCard.displayName = 'CustomerCard'

export default CustomerCard