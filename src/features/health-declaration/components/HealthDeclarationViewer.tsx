import React from 'react'
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  PenTool,
} from '@/components/ui/icon'
import {
  extractMedicalAlerts,
  buildQuestionAnswerList,
} from '../utils/health-alerts'
import { isHealthDeclarationValid } from '../utils/validity'
import { cn } from '@/lib/utils'

export interface HealthDeclarationViewerProps {
  signed?: boolean
  date?: string | null
  url?: string | null
  medicalNotes?: string | null
  answers?: Record<string, unknown> | null
  allergies?: string | null
  customerName?: string | null
  formResponseId?: string | null
  compact?: boolean
  validityMonths?: number
  onOpenFull?: () => void
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export const HealthDeclarationViewer: React.FC<HealthDeclarationViewerProps> = ({
  signed = false,
  date,
  url,
  medicalNotes,
  answers,
  allergies,
  customerName,
  formResponseId: propFormResponseId,
  compact = false,
  validityMonths = 6,
  onOpenFull,
}) => {
  const alerts = extractMedicalAlerts({ answers, medicalNotes, allergies })
  const qaList = buildQuestionAnswerList({ answers, medicalNotes })
  const isExpired = Boolean(signed && date && !isHealthDeclarationValid(date, validityMonths))

  // Digital signature in answers if available
  const digitalSignature =
    answers?.['חתימה דיגיטלית או אישור הצהרה'] ||
    answers?.signature ||
    answers?.['חתימה'] ||
    null

  // Resolve form response ID from prop or answers
  const formResponseId =
    propFormResponseId ||
    (answers?.form_response_id as string | undefined) ||
    (answers?.formResponseId as string | undefined) ||
    (answers?.['form_response_id'] as string | undefined)

  // Direct Google Forms link: with ?edit2=responseId if available
  const rawUrl = url || (answers?.form_url as string | undefined) || (answers?.formUrl as string | undefined)
  const formDirectUrl = React.useMemo(() => {
    if (!rawUrl) return null
    const cleanUrl = rawUrl.replace(/\?.*$/, '')
    if (formResponseId) {
      return `${cleanUrl}?edit2=${encodeURIComponent(formResponseId)}`
    }
    return rawUrl
  }, [rawUrl, formResponseId])

  const formattedDate = formatDate(date)

  if (compact) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 text-right font-assistant" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className={signed ? (isExpired ? 'text-warning' : 'text-status-done') : 'text-muted-foreground'} />
            <span className="text-xs font-semibold text-foreground">הצהרת בריאות</span>
          </div>
          {signed ? (
            isExpired ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 border border-warning/30 px-2.5 py-0.5 text-micro font-medium text-warning">
                <AlertTriangle size={12} />
                פג תוקף — נדרש חידוש
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-status-done/15 px-2.5 py-0.5 text-micro font-medium text-status-done">
                <CheckCircle2 size={12} />
                חתומה ומאושרת ✓
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-ink/15 px-2.5 py-0.5 text-micro font-medium text-accent-ink">
              טרם נחתמה
            </span>
          )}
        </div>

        {/* Alerts in compact mode */}
        {alerts.length > 0 ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-2.5 space-y-1.5 text-right">
            <div className="flex items-center gap-1.5 text-micro font-semibold text-destructive">
              <AlertTriangle size={13} />
              <span>זוהו {alerts.length} התראות רפואיות:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {alerts.map((a) => (
                <span
                  key={a.id}
                  className={cn(
                    'inline-flex items-center rounded-md px-1.5 py-0.5 text-micro font-medium',
                    a.severity === 'danger'
                      ? 'bg-destructive/20 text-destructive border border-destructive/20'
                      : 'bg-warning/20 text-warning border border-warning/20',
                  )}
                >
                  {a.label}
                  {a.detail ? `: ${a.detail}` : ''}
                </span>
              ))}
            </div>
          </div>
        ) : signed && !isExpired ? (
          <div className="rounded-xl border border-status-done/20 bg-status-done/5 p-2 text-micro font-medium text-status-done text-right flex items-center gap-1.5">
            <CheckCircle2 size={13} />
            <span>ללא התוויות נגד רפואיות שדווחו</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between text-micro text-muted-foreground pt-0.5">
          {formattedDate && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Calendar size={12} />
              תאריך: {formattedDate}
              {isExpired && <span className="text-warning font-semibold">(פג תוקף)</span>}
            </span>
          )}
          {onOpenFull && (
            <button
              type="button"
              onClick={onOpenFull}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer ms-auto"
            >
              <span>צפה בכל התשובות ({qaList.length})</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3.5 text-right font-assistant" dir="rtl">
      {/* 1. Status & Signature Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/20 p-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-xl',
              signed ? 'bg-status-done/15 text-status-done' : 'bg-muted text-muted-foreground',
              !signed
                ? 'bg-muted text-muted-foreground'
                : isExpired
                  ? 'bg-warning/15 text-warning'
                  : 'bg-status-done/15 text-status-done',
            )}
          >
            {!signed ? (
              <ShieldAlert size={16} />
            ) : isExpired ? (
              <AlertTriangle size={16} />
            ) : (
              <FileCheck size={16} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-foreground">
                {signed
                  ? customerName
                    ? `טופס הצהרה חתום — ${customerName}`
                    : 'טופס הצהרת בריאות חתום'
                  : 'ממתין לחתימת הלקוח על ההצהרה'}
              </span>
              {signed && (
                isExpired ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 border border-warning/30 px-2 py-0.5 text-micro font-medium text-warning">
                    <AlertTriangle size={11} />
                    פג תוקף — נדרש חידוש
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-done/15 px-2 py-0.5 text-micro font-medium text-status-done">
                    <CheckCircle2 size={11} />
                    מאושר
                  </span>
                )
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-micro text-muted-foreground mt-0.5">
              {formattedDate && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Calendar size={11} />
                  {formattedDate}
                  {isExpired && <span className="text-warning font-semibold">(פג תוקף)</span>}
                </span>
              )}
              {digitalSignature && (
                <span className="inline-flex items-center gap-1">
                  <PenTool size={11} />
                  חתימה: <span className="font-medium text-foreground">{String(digitalSignature)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {formDirectUrl && (
          <a
            href={formDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          >
            <span>צפה בטופס ב-Google Forms</span>
            <ExternalLink size={12} className="text-muted-foreground" />
          </a>
        )}
      </div>

      {/* Expired Notice Banner */}
      {isExpired && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-3 space-y-1 text-right text-warning">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <AlertTriangle size={14} className="shrink-0" />
            <span>תוקף הצהרת הבריאות פג</span>
          </div>
          <p className="text-micro text-warning/90">
            הצהרת הבריאות נחתמה בעבר, אך תוקפה פג לפי מדיניות הסטודיו (תוקף: {validityMonths === 0 ? 'לתור הנוכחי בלבד' : validityMonths === 3 ? '3 חודשים' : validityMonths === 12 ? 'שנה אחת' : `${validityMonths} חודשים`}). יש לבקש מהלקוח לחדש את ההצהרה לפני התור הבא. התשובות וההתראות הרפואיות שלמטה נשמרות לעיונך.
          </p>
        </div>
      )}

      {/* 2. Medical Alerts Banner */}
      {alerts.length > 0 ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle size={15} className="shrink-0" />
            <span>לתשומת לב המקעקע: זוהו {alerts.length} התראות רפואיות</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {alerts.map((alert) => (
              <span
                key={alert.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium',
                  alert.severity === 'danger'
                    ? 'border border-destructive/30 bg-destructive/20 text-destructive'
                    : 'border border-warning/30 bg-warning/20 text-warning',
                )}
              >
                <span className="font-semibold">{alert.label}</span>
                {alert.detail && <span>: {alert.detail}</span>}
              </span>
            ))}
          </div>
        </div>
      ) : signed && !isExpired ? (
        <div className="rounded-2xl border border-status-done/20 bg-status-done/5 px-3 py-2 flex items-center gap-2 text-xs font-medium text-status-done">
          <CheckCircle2 size={15} className="shrink-0" />
          <span>הלקוח הצהיר שאינו סובל מבעיות רפואיות ואינו נוטל מדללי דם / תרופות קבועות.</span>
        </div>
      ) : null}

      {/* 3. Detailed Dynamic Questions & Answers */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-semibold text-muted-foreground px-1">
          תשובות לשאלון ({qaList.length} שאלות):
        </h4>

        {qaList.length > 0 ? (
          <div className="rounded-2xl border border-border/70 bg-card divide-y divide-border/50 overflow-hidden text-xs">
            {qaList.map((item, index) => (
              <div
                key={`${item.question}-${index}`}
                className={cn(
                  'flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 px-3 py-2 text-right transition-colors',
                  item.isAlert && 'bg-destructive/5',
                )}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-muted-foreground">
                    {item.question}
                  </span>
                  {item.isAlert && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-micro font-semibold bg-destructive/15 text-destructive shrink-0">
                      <AlertTriangle size={10} />
                      חריג
                    </span>
                  )}
                </div>
                <div
                  className={cn(
                    'font-medium text-left sm:text-left whitespace-pre-line shrink-0 sm:max-w-[55%]',
                    item.isAlert ? 'text-destructive font-semibold' : 'text-foreground',
                  )}
                >
                  {item.answer}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
            {signed
              ? 'ההצהרה סומנה כחתומה במערכת, אך אין פירוט שאלות גולמי זמין.'
              : 'הלקוח עדיין לא מילא את הטופס.'}
          </div>
        )}
      </div>
    </div>
  )
}

export default HealthDeclarationViewer
