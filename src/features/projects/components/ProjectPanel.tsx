import { useState } from 'react'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProjectTimeline } from '@/features/calendar/components/ProjectTimeline'
import { formatPhoneForDisplay } from '@/lib/phone'
import { useProjectDetails } from '../hooks/use-project-details'
import { useProjectMilestones } from '../hooks/use-project-milestones'
import { LOST_REASON_LABELS } from '../utils/labels'
import type { ProjectDetails } from '../types'
import { ProjectStageBadge } from './ProjectStageBadge'
import { ProjectDetailsForm } from './ProjectDetailsForm'
import { MoveAppointmentSection } from './MoveAppointmentSection'
import { MarkProjectLostDialog } from './MarkProjectLostDialog'

function errorText(error: unknown): string | null {
  return error instanceof Error ? error.message : null
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  )
}

function ProjectActions({ project, onMarkLost }: { project: ProjectDetails; onMarkLost: () => void }) {
  const { reopen, complete } = useProjectMilestones()
  if (!project.canManage) return null
  const closed = project.stage === 'lost' || project.stage === 'completed'
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
      {closed ? (
        <Button type="button" variant="outline" size="sm" disabled={reopen.isPending} onClick={() => reopen.mutate(project.id)}>
          פתיחה מחדש
        </Button>
      ) : (
        <>
          <Button type="button" variant="outline" size="sm" disabled={complete.isPending} onClick={() => complete.mutate(project.id)}>
            סיום פרויקט
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={onMarkLost}>
            סימון כאבוד
          </Button>
        </>
      )}
    </div>
  )
}

/**
 * One tattoo piece: its stage, quote and session estimate, every appointment in it, and the few
 * things staff decide by hand. Opened from the leads board (and later the calendar and customers).
 */
export function ProjectPanel({ projectId, onClose }: { projectId: string | null; onClose: () => void }) {
  const { details, update, move } = useProjectDetails(projectId)
  const [losing, setLosing] = useState(false)
  const project = details.data

  return (
    <ResponsiveDialog
      open={Boolean(projectId)}
      onOpenChange={(open) => !open && onClose()}
      title={project ? project.title || 'פרויקט' : 'פרויקט'}
      description={project ? `${project.customer.name || 'לקוח ללא שם'} · ${formatPhoneForDisplay(project.customer.phone)}` : undefined}
    >
      <div className="flex flex-col gap-4 font-assistant" dir="rtl">
        {details.isLoading && <PanelSkeleton />}
        {details.isError && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {errorText(details.error) ?? 'טעינת הפרויקט נכשלה.'}
          </p>
        )}
        {project && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <ProjectStageBadge stage={project.stage} />
              {project.stage === 'lost' && project.lostReason && (
                <span className="text-xs text-muted-foreground">
                  {LOST_REASON_LABELS[project.lostReason]}
                  {project.lostNote ? ` · ${project.lostNote}` : ''}
                </span>
              )}
            </div>

            <ProjectDetailsForm project={project} isSaving={update.isPending} error={errorText(update.error)} onSave={(values) => update.mutate(values)} />

            {project.timeline.length > 0 ? (
              <ProjectTimeline appointments={project.timeline} showSingle />
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">עדיין אין תורים בפרויקט הזה.</p>
            )}

            {project.canManage && project.timeline.length > 0 && (
              <MoveAppointmentSection
                project={project}
                isMoving={move.isPending}
                error={errorText(move.error)}
                onMove={(appointmentId, target) => move.mutate({ appointmentId, target })}
              />
            )}

            <ProjectActions project={project} onMarkLost={() => setLosing(true)} />
            {losing && <MarkProjectLostDialog projectId={project.id} projectTitle={project.title} open onOpenChange={setLosing} />}
          </>
        )}
      </div>
    </ResponsiveDialog>
  )
}
