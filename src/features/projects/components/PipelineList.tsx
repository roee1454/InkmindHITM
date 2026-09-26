import { PipelineCustomerCell, PipelineDetails, PipelineStageCell } from './PipelineProjectSummary'
import { PipelineRowActions } from './PipelineRowActions'
import type { PipelineProject } from '@/features/projects/types'

interface PipelineListProps {
  projects: PipelineProject[]
  now: Date
  onMarkLost: (project: PipelineProject) => void
  onReopen: (project: PipelineProject) => void
  onOpenProject: (project: PipelineProject) => void
}

/** A table on desktop, cards on mobile. */
export function PipelineList({ projects, now, ...actions }: PipelineListProps) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-3xl border border-border bg-card font-assistant shadow-xs md:block" dir="rtl">
        <table className="w-full border-collapse text-start">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-sm font-bold text-muted-foreground">
              <th className="px-5 py-3.5 text-start">לקוח ופרויקט</th>
              <th className="px-5 py-3.5 text-start">שלב</th>
              <th className="px-5 py-3.5 text-start">פרטים</th>
              <th className="px-5 py-3.5" aria-label="פעולות" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-sm">
            {projects.map((project) => (
              <tr key={project.projectId} className="transition-colors hover:bg-muted/30">
                <td className="max-w-64 px-5 py-3.5 align-middle">
                  <PipelineCustomerCell project={project} />
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <PipelineStageCell project={project} now={now} />
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <PipelineDetails project={project} />
                </td>
                <td className="px-3 py-3.5 align-middle">
                  <PipelineRowActions project={project} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 font-assistant md:hidden" dir="rtl">
        {projects.map((project) => (
          <div key={project.projectId} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <PipelineCustomerCell project={project} />
              <PipelineStageCell project={project} now={now} />
            </div>
            <div className="flex items-end justify-between gap-2 border-t border-border/40 pt-2.5">
              <PipelineDetails project={project} />
              <PipelineRowActions project={project} {...actions} />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
