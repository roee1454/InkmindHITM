import { ChevronLeft } from '@/components/ui/icon'
import { formatIls } from '@/features/payments/utils/labels'
import { ProjectStageLabel } from '@/features/projects/components/ProjectStageLabel'
import { projectCardFact } from '@/features/projects/utils/board'
import type { PipelineProject } from '@/features/projects/types'

interface CustomerProjectsTabProps {
  projects: PipelineProject[]
  now: Date
  onOpenProject: (projectId: string) => void
}

/**
 * Every piece the customer has had with the studio, open work first. A row, not the board's
 * ProjectCard: the board card leads with the customer's name, which here is the sheet's title.
 * The row carries the same stage fact (projectCardFact) so both screens say the same thing.
 */
export function CustomerProjectsTab({ projects, now, onOpenProject }: CustomerProjectsTabProps) {
  if (projects.length === 0) {
    return <div className="flex flex-col gap-1 py-6">
        <p className="text-sm font-bold text-foreground">עדיין אין פרויקטים</p>
        <p className="text-sm text-muted-foreground">פרויקט נפתח כשהלקוח מבקש לקבוע ייעוץ או תור.</p>
      </div>
  }

  const closed = (p: PipelineProject) => p.stage === 'completed' || p.stage === 'lost'
  const ordered = [...projects.filter((p) => !closed(p)), ...projects.filter(closed)]

  return (
    <ul className="flex flex-col divide-y divide-border/70">
      {ordered.map((project) => (
        <li key={project.projectId}>
          <button
            type="button"
            onClick={() => onOpenProject(project.projectId)}
            className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg px-2 py-3 text-start transition-colors duration-150 hover:bg-muted/50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex min-w-0 items-center justify-between gap-3">
                <span className="truncate text-sm font-bold text-foreground">{project.title || 'ללא כותרת'}</span>
                <ProjectStageLabel stage={project.stage} />
              </span>
              <span className="line-clamp-2 text-sm text-muted-foreground">{projectCardFact(project, now)}</span>
              {(project.staffName || project.due > 0 || project.credit > 0) && (
                <span className="flex flex-wrap items-center gap-x-3 text-xs">
                  {project.staffName && <span className="text-muted-foreground">{project.staffName}</span>}
                  {project.due > 0 && <span className="font-bold text-warning">יתרה {formatIls(project.due)}</span>}
                  {project.credit > 0 && <span className="font-bold text-foreground">זיכוי {formatIls(project.credit)}</span>}
                </span>
              )}
            </span>
            <ChevronLeft size={16} className="shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  )
}
