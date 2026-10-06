import type React from 'react'
import { cn } from '@/lib/utils'
import { formatIls } from '@/features/payments/utils/labels'
import type { ProjectFinance } from '@/features/payments/types'
import { formatApprox, formatQuote, formatShortSlot } from '../../utils/format'
import type { PanelSummary } from '../../utils/panel'
import type { DraftField, ProjectDraft } from '../../utils/project-draft'
import type { ProjectDetails } from '../../types'
import { PanelInput } from './PanelInput'

interface Fact {
  label: string
  value: React.ReactNode
  hint?: string
  tone?: string
  /** Read-only while the rest of the strip is being edited. */
  locked?: boolean
}

interface EditProps {
  draft: ProjectDraft
  invalidField: DraftField | null
  onDraftChange: (field: DraftField, value: string) => void
}

function numberField(field: DraftField, label: string, edit: EditProps, className: string) {
  return (
    <PanelInput
      type="number"
      inputMode="numeric"
      min={field === 'sessions' ? 1 : 0}
      aria-label={label}
      aria-invalid={edit.invalidField === field || undefined}
      value={edit.draft[field]}
      onChange={(e) => edit.onDraftChange(field, e.target.value)}
      // No spin arrows: they eat a third of a narrow field and nobody steps a price by ₪1.
      className={cn('tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none', className)}
    />
  )
}

function progressFact(project: ProjectDetails, summary: PanelSummary, edit: EditProps | null): Fact {
  const done = summary.sessionsDone
  const hint = summary.next ? `הבא ${formatShortSlot(summary.next.start)}` : done > 0 ? 'אין תור עתידי' : 'עוד לא נקבע סשן'
  if (edit) {
    return {
      label: 'סשנים',
      value: (
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {done} מתוך {numberField('sessions', 'מספר סשנים משוער', edit, 'w-16 text-center')}
        </span>
      ),
      hint: 'הערכה: כמה סשנים ייקח',
    }
  }
  return { label: 'סשנים', value: project.estimatedSessions ? `${done} מתוך ${formatApprox(project.estimatedSessions)}` : String(done), hint }
}

function quoteFact(project: ProjectDetails, edit: EditProps | null): Fact {
  if (edit) {
    return {
      label: 'הצעת מחיר (₪)',
      value: (
        // Left-to-right like a printed range (₪4,500–6,000), so "from" sits on the left of "to".
        <span dir="ltr" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {numberField('quoteMin', 'מחיר מינימלי', edit, 'w-[4.75rem]')}–{numberField('quoteMax', 'מחיר מקסימלי', edit, 'w-[4.75rem]')}
        </span>
      ),
      hint: 'טווח, או אותו מחיר בשני השדות',
    }
  }
  const quote = formatQuote(project.quoteMin, project.quoteMax)
  return quote ? { label: 'הצעת מחיר', value: quote } : { label: 'הצעת מחיר', value: '—', hint: 'לא נשלחה הצעה' }
}

export function balanceFact(
  project: ProjectDetails,
  summary: PanelSummary,
  finance: ProjectFinance | undefined,
  locked: boolean,
): Fact {
  if (!finance) return { label: 'יתרה', value: '…', locked }
  const { due, credit, billed, paid } = finance.balance
  if (due > 0) return { label: 'יתרה לתשלום', value: formatIls(due), hint: `שולמו ${formatIls(paid)} מתוך ${formatIls(billed)}`, tone: 'text-warning', locked }

  const hasUnclosedCompleted = summary.appointments.some(
    (a) => (a.kind === 'session' || a.kind === 'touch_up') && a.status === 'completed' && a.finalPrice == null && !a.chargeWaived,
  )
  if (hasUnclosedCompleted) {
    return { label: 'יתרה', value: 'ממתין לסגירה', hint: 'חסר מחיר סופי לסשן שהסתיים', tone: 'text-warning', locked }
  }

  const upcomingCount = summary.appointments.filter((a) => a.status === 'pending' || a.status === 'confirmed').length
  if (credit > 0) {
    if (upcomingCount > 0) {
      return {
        label: 'מקדמה שולמה',
        value: formatIls(credit),
        hint: upcomingCount > 1 ? 'משוריין לתורים הבאים' : 'משוריין לתור הבא',
        tone: 'text-status-done',
        locked,
      }
    }
    if (project.stage === 'completed' && billed === 0) {
      return { label: 'יתרה', value: 'מאוזן', hint: `שולמו ${formatIls(paid)} במלואם`, tone: 'text-status-done', locked }
    }
    return { label: 'זיכוי ללקוח', value: formatIls(credit), hint: 'שולם מעבר למה שחויב', tone: 'text-status-done', locked }
  }

  if (billed > 0 || (project.stage === 'completed' && paid > 0)) {
    return { label: 'יתרה', value: 'מאוזן', hint: `שולמו ${formatIls(paid)} במלואם`, tone: 'text-status-done', locked }
  }
  return { label: 'יתרה', value: '₪0', hint: 'עוד לא חויב', locked }
}

interface ProjectFactsProps {
  project: ProjectDetails
  summary: PanelSummary
  finance: ProjectFinance | undefined
  /** Set while editing: the quote and the session estimate become fields in their own cells. */
  edit: EditProps | null
}

/**
 * The three numbers a project is judged by — how far along, what it's worth, what's owed. One
 * surface split by hairlines like the dashboard's StatStrip; on a phone each fact is a single
 * label/value line so a long quote range never has to squeeze into a third of the width. Editing
 * happens in the same cells, so the numbers never jump to a separate form.
 */
export function ProjectFacts({ project, summary, finance, edit }: ProjectFactsProps) {
  const facts = [progressFact(project, summary, edit), quoteFact(project, edit), balanceFact(project, summary, finance, Boolean(edit))]

  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className={cn(
            'flex items-center justify-between gap-3 bg-card px-4 py-3 lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:py-3.5',
            // Dim the contents, not the cell: a translucent cell shows the hairline grid behind it.
            fact.locked && '[&>*]:opacity-50',
          )}
        >
          <dt className="text-xs font-bold text-muted-foreground">{fact.label}</dt>
          <dd className="flex min-w-0 flex-col items-end gap-0.5 lg:items-start">
            {typeof fact.value === 'string' ? (
              <span className={cn('text-base font-extrabold tracking-tight text-foreground tabular-nums lg:text-2xl', fact.tone)}>{fact.value}</span>
            ) : (
              fact.value
            )}
            {fact.hint && <span className="text-2xs font-medium text-muted-foreground">{fact.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
