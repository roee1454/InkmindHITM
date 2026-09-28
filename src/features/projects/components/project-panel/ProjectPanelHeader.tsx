import { PencilSimple } from '@/components/ui/icon'
import { formatPhoneForDisplay } from '@/lib/phone'
import { LOST_REASON_LABELS } from '../../utils/labels'
import { daysInStage } from '../../utils/pipeline'
import type { ProjectDetails } from '../../types'
import { ProjectStageBadge } from '../ProjectStageBadge'

function stageAge(days: number | null): string | null {
  if (days === null) return null
  if (days === 0) return 'נכנס לשלב היום'
  if (days === 1) return 'בשלב מאתמול'
  return `${days} ימים בשלב`
}

/** Where the piece stands and whose it is: stage, title, customer — and the way into editing it. */
export function ProjectPanelHeader({ project, now, onEdit }: { project: ProjectDetails; now: Date; onEdit: () => void }) {
  const lost = project.stage === 'lost' && project.lostReason
  const age = stageAge(daysInStage(project.stageChangedAt, now))

  return (
    <header className="flex flex-col gap-2 px-5 pt-5 pb-4 pe-12 lg:px-6 lg:pt-6 lg:pe-14">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <ProjectStageBadge stage={project.stage} />
        {lost ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {LOST_REASON_LABELS[project.lostReason!]}
            {project.lostNote ? ` · ${project.lostNote}` : ''}
          </span>
        ) : (
          age && <span className="text-xs font-semibold text-muted-foreground">{age}</span>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 text-xl font-extrabold tracking-tight text-balance text-foreground lg:text-2xl">{project.title || 'פרויקט ללא שם'}</h2>
        {project.canManage && (
          <button
            type="button"
            onClick={onEdit}
            className="mt-0.5 flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          >
            <PencilSimple size={15} />
            עריכה
          </button>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <span className="font-bold text-foreground">{project.customer.name || 'לקוח ללא שם'}</span>
        {project.customer.phone && (
          <>
            <span aria-hidden>·</span>
            <span dir="ltr" className="tabular-nums">
              {formatPhoneForDisplay(project.customer.phone)}
            </span>
          </>
        )}
      </p>
    </header>
  )
}
