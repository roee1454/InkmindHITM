import { ProjectStageBadge } from '@/features/projects/components/ProjectStageBadge'
import { LOST_REASON_LABELS } from '@/features/projects/utils/labels'
import { daysInStage } from '@/features/projects/utils/pipeline'
import { formatQuote, formatShortSlot } from '@/features/projects/utils/format'
import { formatIls } from '@/features/payments/utils/labels'
import { formatPhoneForDisplay } from '@/lib/phone'
import type { PipelineProject } from '@/features/projects/types'

/** The customer and the piece. */
export function PipelineCustomerCell({ project }: { project: PipelineProject }) {
  return (
    <div className="min-w-0">
      <div className="truncate font-extrabold text-foreground">{project.customerName || 'לקוח ללא שם'}</div>
      <div className="truncate text-xs text-muted-foreground">
        {project.title || 'ללא כותרת'} · <span dir="ltr">{formatPhoneForDisplay(project.customerPhone)}</span>
      </div>
    </div>
  )
}

/** Stage, how long it's been there, and why it was lost. */
export function PipelineStageCell({ project, now }: { project: PipelineProject; now: Date }) {
  const days = daysInStage(project.stageChangedAt, now)
  return (
    <div className="flex flex-col items-start gap-1">
      <ProjectStageBadge stage={project.stage} />
      <span className="text-2xs text-muted-foreground">
        {project.stage === 'lost' && project.lostReason ? `${LOST_REASON_LABELS[project.lostReason]} · ` : ''}
        {days === null ? '' : days === 0 ? 'היום' : `${days} ימים בשלב`}
      </span>
    </div>
  )
}

/** Artist, quote, what's next and what's owed — whichever of them exist. */
export function PipelineDetails({ project }: { project: PipelineProject }) {
  const quote = formatQuote(project.quoteMin, project.quoteMax)
  return (
    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
      {project.staffName && <span>{project.staffName}</span>}
      {quote && <span>הצעה: {quote}</span>}
      {project.nextAppointmentAt && <span className="text-foreground">הבא: {formatShortSlot(project.nextAppointmentAt)}</span>}
      {project.due > 0 && <span className="font-bold text-warning">יתרה {formatIls(project.due)}</span>}
      {project.credit > 0 && <span className="font-bold text-status-done">זיכוי {formatIls(project.credit)}</span>}
    </div>
  )
}
