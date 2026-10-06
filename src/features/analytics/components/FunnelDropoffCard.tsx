import React from 'react'
import type { ConversionFunnelStage } from '../types'

interface FunnelDropoffCardProps {
  funnel: ConversionFunnelStage[]
  totalLeads: number
}

const DROPOFF_LABELS: Record<string, string> = {
  leads: 'נעצרו לפני קבלת מחיר',
  quote: 'קיבלו מחיר אך לא שריינו',
  booked: 'שוריינו אך בוטלו / לא בוצעו',
}

export const FunnelDropoffCard: React.FC<FunnelDropoffCardProps> = ({ funnel, totalLeads }) => {
  return (
    <div className="card-native overflow-hidden font-assistant">
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pt-5">
        <div>
          <h3 className="text-base font-extrabold text-foreground">משפך המרה ונשירה</h3>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            מעקב אחר שלבי התקדמות הלקוחות מזיהוי ועד ביצוע התור
          </p>
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-4 p-5 sm:space-y-5 sm:p-6">
        {totalLeads > 0 ? (
          funnel.map((stage, idx) => {
            const hasNext = idx < funnel.length - 1
            const dropoffLabel = DROPOFF_LABELS[stage.id]

            return (
              <div key={stage.id} className="space-y-2">
                {/* Stage Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-extrabold text-foreground">{stage.label}</span>
                    <span className="hidden text-muted-foreground sm:inline">• {stage.sublabel}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className="text-sm font-extrabold text-foreground">{stage.count}</span>
                    <span className="text-xs font-bold text-muted-foreground">
                      ({stage.percentOfTotal}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    style={{ width: `${Math.max(stage.percentOfTotal, stage.count > 0 ? 3 : 0)}%` }}
                    className="h-full rounded-full bg-primary transition-all duration-500"
                  />
                </div>

                {/* Drop-off notice */}
                {hasNext && stage.dropoffCount > 0 && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-1.5 text-2xs text-muted-foreground sm:text-xs">
                    <span>{dropoffLabel}:</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {stage.dropoffCount} לקוחות ({stage.dropoffPercent}%)
                    </span>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <p className="text-sm font-bold text-foreground">אין נתוני משפך לתקופה שנבחרה</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              הנתונים יתעדכנו אוטומטית עם כניסת פניות חדשות
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
