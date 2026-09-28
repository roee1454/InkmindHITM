import { useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useProjectFinance } from '@/features/payments/hooks/use-project-finance'
import { useProjectDetails } from '../hooks/use-project-details'
import { useProjectMilestones } from '../hooks/use-project-milestones'
import { summarizeProject } from '../utils/panel'
import type { ProjectDetails } from '../types'
import { ProjectDetailsForm } from './ProjectDetailsForm'
import { MarkProjectLostDialog } from './MarkProjectLostDialog'
import { ProjectPanelHeader } from './project-panel/ProjectPanelHeader'
import { ProjectFacts } from './project-panel/ProjectFacts'
import { ProjectSessions } from './project-panel/ProjectSessions'
import { ProjectPayments } from './project-panel/ProjectPayments'

function errorText(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-5 py-6 lg:px-6">
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)]">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  )
}

function ProjectFooter({ project, onMarkLost }: { project: ProjectDetails; onMarkLost: () => void }) {
  const { reopen, complete } = useProjectMilestones()
  const closed = project.stage === 'lost' || project.stage === 'completed'
  return (
    <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:px-6 lg:pb-3">
      {closed ? (
        <Button type="button" variant="outline" size="sm" className="ms-auto" disabled={reopen.isPending} onClick={() => reopen.mutate(project.id)}>
          פתיחה מחדש
        </Button>
      ) : (
        <>
          <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onMarkLost}>
            סימון כאבוד
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={complete.isPending} onClick={() => complete.mutate(project.id)}>
            סיום פרויקט
          </Button>
        </>
      )}
    </footer>
  )
}

/**
 * One tattoo piece, whole: where it stands, what it's worth and what's owed, every appointment in
 * it and every payment against it. Opened from the projects board, the calendar and the customer
 * card. Editing the name, quote and estimate is a mode of the header, not the first thing on screen.
 */
export function ProjectPanel({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { details, update, move } = useProjectDetails(projectId)
  const finance = useProjectFinance(projectId)
  const [editing, setEditing] = useState(false)
  const [losing, setLosing] = useState(false)
  const project = details.data
  const now = new Date()
  const summary = project ? summarizeProject(project, finance.data, now) : null

  return (
    <ResponsiveDialog
      open={Boolean(projectId)}
      onOpenChange={(open) => {
        if (open) return
        setEditing(false)
        onClose()
      }}
      title={project ? project.title || 'פרויקט' : 'פרויקט'}
      description={project ? project.customer.name || 'לקוח ללא שם' : undefined}
      hideHeader
      contentClassName="gap-0 overflow-hidden p-0 max-lg:pt-3 lg:max-h-[min(54rem,calc(100dvh-2rem))] lg:max-w-3xl"
    >
      {details.isLoading && <PanelSkeleton />}
      {details.isError && !project && (
        <p className="m-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{errorText(details.error) ?? 'טעינת הפרויקט נכשלה.'}</p>
      )}
      {project && summary && (
        <>
          {editing ? (
            <div className="px-5 pt-5 pb-4 pe-12 lg:px-6 lg:pt-6 lg:pe-14">
              <ProjectDetailsForm
                project={project}
                isSaving={update.isPending}
                error={errorText(update.error)}
                onSave={(values) => update.mutate(values, { onSuccess: () => setEditing(false) })}
                onCancel={() => setEditing(false)}
              />
            </div>
          ) : (
            <ProjectPanelHeader project={project} now={now} onEdit={() => setEditing(true)} />
          )}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-6 px-5 pb-6 lg:px-6">
              <ProjectFacts project={project} summary={summary} finance={finance.data} />
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] lg:gap-8">
                <ProjectSessions
                  appointments={summary.appointments}
                  project={project}
                  isMoving={move.isPending}
                  onMove={(appointmentId, target) => move.mutate({ appointmentId, target })}
                />
                <ProjectPayments finance={finance.data} isLoading={finance.isLoading} error={errorText(finance.error)} appointments={summary.appointments} />
              </div>
              {move.error && <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{errorText(move.error)}</p>}
            </div>
          </div>

          {project.canManage && <ProjectFooter project={project} onMarkLost={() => setLosing(true)} />}
          {losing && <MarkProjectLostDialog projectId={project.id} projectTitle={project.title} open onOpenChange={setLosing} />}
        </>
      )}
    </ResponsiveDialog>
  )
}
