import { ChevronLeft } from '@/components/ui/icon'
import { formatIls } from '@/features/payments/utils/labels'
import { ProjectStageBadge } from '@/features/projects/components/ProjectStageBadge'
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
    return <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">ללקוח הזה עדיין אין פרויקטים.</p>
  }

  const closed = (p: PipelineProject) => p.stage === 'completed' || p.stage === 'lost'
  const ordered = [...projects.filter((p) => !closed(p)), ...projects.filter(closed)]

  return (
    <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
      {ordered.map((project) => (
        <li key={project.projectId}>
          <button
            type="button"
            onClick={() => onOpenProject(project.projectId)}
            className="flex w-full cursor-pointer items-center gap-3 bg-card px-3.5 py-3 text-right transition-colors duration-150 hover:bg-muted/50"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-extrabold text-foreground">{project.title || 'ללא כותרת'}</span>
                <ProjectStageBadge stage={project.stage} />
              </span>
              <span className="line-clamp-2 text-xs font-semibold text-foreground/75">{projectCardFact(project, now)}</span>
              {(project.staffName || project.due > 0 || project.credit > 0) && (
                <span className="flex flex-wrap items-center gap-x-2 text-2xs font-bold">
                  {project.staffName && <span className="text-muted-foreground">{project.staffName}</span>}
                  {project.due > 0 && <span className="text-warning">יתרה {formatIls(project.due)}</span>}
                  {project.credit > 0 && <span className="text-status-done">זיכוי {formatIls(project.credit)}</span>}
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
