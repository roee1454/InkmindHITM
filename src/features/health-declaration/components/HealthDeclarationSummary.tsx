import { StatusLabel } from '@/components/ui/status-label'
import { extractMedicalAlerts } from '../utils/health-alerts'
import { isHealthDeclarationValid } from '../utils/validity'
import type { HealthDeclarationViewerProps } from './HealthDeclarationViewer'

type SummaryProps = Pick<HealthDeclarationViewerProps, 'signed' | 'date' | 'medicalNotes' | 'answers' | 'allergies' | 'validityMonths'> & {
  onOpenFull?: () => void
}

/**
 * Where the health declaration stands, in one row, with the medical flags listed as plain lines
 * below it. The full form and its answers open from the row; this is the summary a form or a card
 * carries, where the viewer's boxed layout used to sit inside another box.
 */
export function HealthDeclarationSummary({ signed = false, date, medicalNotes, answers, allergies, validityMonths = 6, onOpenFull }: SummaryProps) {
  const alerts = extractMedicalAlerts({ answers, medicalNotes, allergies })
  const expired = Boolean(signed && date && !isHealthDeclarationValid(date, validityMonths))
  const dateText = date && !Number.isNaN(new Date(date).getTime()) ? new Date(date).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : ''

  return (
    <div className="flex flex-col gap-2 font-assistant" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-bold text-foreground">הצהרת בריאות</span>
          {!signed ? (
            <StatusLabel role="new">עדיין לא נחתמה</StatusLabel>
          ) : expired ? (
            <StatusLabel role="warning">{`פגה${dateText ? ` (נחתמה ${dateText})` : ''}, צריך לחדש`}</StatusLabel>
          ) : (
            <StatusLabel role="done">{`נחתמה${dateText ? ` ב-${dateText}` : ''}`}</StatusLabel>
          )}
        </div>
        {onOpenFull && signed && (
          <button type="button" onClick={onOpenFull} className="shrink-0 cursor-pointer text-sm font-semibold text-foreground underline underline-offset-4 hover:text-muted-foreground">
            צפייה בתשובות
          </button>
        )}
      </div>
      {alerts.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-foreground">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-baseline gap-2">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
              <span>
                <span className="font-semibold">{alert.label}</span>
                {alert.detail ? `: ${alert.detail}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
