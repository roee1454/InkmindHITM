import { cn } from '@/lib/utils'
import { formatIls } from '@/features/payments/utils/labels'
import type { ProjectFinance } from '@/features/payments/types'
import { formatApprox, formatQuote, formatShortSlot } from '../../utils/format'
import type { PanelSummary } from '../../utils/panel'
import type { ProjectDetails } from '../../types'

interface Fact {
  label: string
  value: string
  hint?: string
  tone?: string
}

function progressFact(project: ProjectDetails, summary: PanelSummary): Fact {
  const done = summary.sessionsDone
  const value = project.estimatedSessions ? `${done} מתוך ${formatApprox(project.estimatedSessions)}` : String(done)
  const hint = summary.next ? `הבא ${formatShortSlot(summary.next.start)}` : done > 0 ? 'אין תור עתידי' : 'עוד לא נקבע סשן'
  return { label: 'סשנים', value, hint }
}

function quoteFact(project: ProjectDetails): Fact {
  const quote = formatQuote(project.quoteMin, project.quoteMax)
  return quote ? { label: 'הצעת מחיר', value: quote } : { label: 'הצעת מחיר', value: '—', hint: 'לא נשלחה הצעה' }
}

function balanceFact(finance: ProjectFinance | undefined): Fact {
  if (!finance) return { label: 'יתרה', value: '…' }
  const { due, credit, billed, paid } = finance.balance
  if (due > 0) return { label: 'יתרה לתשלום', value: formatIls(due), hint: `שולמו ${formatIls(paid)} מתוך ${formatIls(billed)}`, tone: 'text-warning' }
  if (credit > 0) return { label: 'זיכוי ללקוח', value: formatIls(credit), hint: 'שולם מעבר למה שחויב', tone: 'text-status-done' }
  if (billed > 0) return { label: 'יתרה', value: 'מאוזן', hint: `שולמו ${formatIls(paid)}`, tone: 'text-status-done' }
  return { label: 'יתרה', value: '₪0', hint: 'עוד לא חויב' }
}

/**
 * The three numbers a project is judged by — how far along, what it's worth, what's owed. One
 * surface split by hairlines like the dashboard's StatStrip; on a phone each fact is a single
 * label/value line so a long quote range never has to squeeze into a third of the width.
 */
export function ProjectFacts({ project, summary, finance }: { project: ProjectDetails; summary: PanelSummary; finance: ProjectFinance | undefined }) {
  const facts = [progressFact(project, summary), quoteFact(project), balanceFact(finance)]

  return (
    <dl className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex items-center justify-between gap-3 bg-card px-4 py-3 lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:py-3.5"
        >
          <dt className="text-xs font-bold text-muted-foreground">{fact.label}</dt>
          <dd className="flex min-w-0 flex-col items-end gap-0.5 lg:items-start">
            <span className={cn('text-base font-extrabold tracking-tight text-foreground tabular-nums lg:text-2xl', fact.tone)}>{fact.value}</span>
            {fact.hint && <span className="text-2xs font-medium text-muted-foreground">{fact.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
