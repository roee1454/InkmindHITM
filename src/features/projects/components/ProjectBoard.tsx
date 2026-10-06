import { ProjectCard } from './ProjectCard'
import { groupByColumn, sortForColumn } from '../utils/board'
import type { BoardColumn } from '../utils/board'
import type { PipelineProject } from '../types'

interface ProjectBoardProps {
  columns: BoardColumn[]
  projects: PipelineProject[]
  now: Date
  artistAvatars: Record<string, string>
  onOpenProject: (project: PipelineProject) => void
}

/**
 * The desktop projects board (track-b B6.10): one lane per stage, so where every piece of work
 * stands reads at a glance instead of row by row. There is no drag and drop — a stage is derived
 * from what happened to the appointments (pb_hooks/lib/project-stage.js), and moving a card by
 * hand would claim something that didn't happen.
 */
export function ProjectBoard({ columns, projects, now, artistAvatars, onOpenProject }: ProjectBoardProps) {
  const grouped = groupByColumn(projects, columns)

  return (
    <div dir="rtl" className="flex h-full min-h-0 gap-3 overflow-x-auto p-4 font-assistant">
      {columns.map((column) => {
        const items = sortForColumn(grouped.get(column.id) ?? [], now)
        return (
          <section key={column.id} aria-label={column.label} className="flex min-w-60 flex-1 flex-col rounded-xl bg-muted/40">
            <header className="flex shrink-0 items-center justify-between px-3 py-2.5">
              <h2 className="text-sm font-extrabold text-foreground">{column.label}</h2>
              <span className="text-xs font-bold tabular-nums text-muted-foreground">{items.length}</span>
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {items.length > 0 ? (
                items.map((project) => (
                  <ProjectCard
                    key={project.projectId}
                    project={project}
                    now={now}
                    avatarUrl={project.staffId ? artistAvatars[project.staffId] : null}
                    onOpen={() => onOpenProject(project)}
                  />
                ))
              ) : (
                <p className="px-2 py-8 text-center text-xs font-medium text-muted-foreground">אין כאן כרגע פרויקטים</p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
