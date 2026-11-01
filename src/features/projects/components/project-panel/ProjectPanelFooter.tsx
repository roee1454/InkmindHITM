import { IMButton } from '@/components/ui/button'
import { Loader2 } from '@/components/ui/icon'
import { useProjectMilestones } from '../../hooks/use-project-milestones'
import type { ProjectDetails } from '../../types'

const FOOTER = 'flex shrink-0 items-center gap-2 border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] lg:px-6 lg:pb-3'

/** The piece's lifecycle: close it as lost, finish it, or reopen a closed one. */
export function ProjectLifecycleFooter({ project, onMarkLost }: { project: ProjectDetails; onMarkLost: () => void }) {
  const { reopen, complete } = useProjectMilestones()
  const closed = project.stage === 'lost' || project.stage === 'completed'
  return (
    <footer className={`${FOOTER} justify-between`}>
      {closed ? (
        <IMButton type="button" variant="outline" size="sm" className="ms-auto" disabled={reopen.isPending} onClick={() => reopen.mutate(project.id)}>
          פתיחה מחדש
        </IMButton>
      ) : (
        <>
          <IMButton type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onMarkLost}>
            סימון כאבוד
          </IMButton>
          <IMButton type="button" variant="outline" size="sm" disabled={complete.isPending} onClick={() => complete.mutate(project.id)}>
            סיום פרויקט
          </IMButton>
        </>
      )}
    </footer>
  )
}

interface EditFooterProps {
  error: string | null
  canSave: boolean
  isSaving: boolean
  onCancel: () => void
}

/** While editing, the footer is the save bar: what's wrong (if anything), cancel, save. */
export function ProjectEditFooter({ error, canSave, isSaving, onCancel }: EditFooterProps) {
  return (
    <footer className={FOOTER}>
      {error ? (
        <p role="alert" className="min-w-0 flex-1 text-xs font-bold text-destructive">
          {error}
        </p>
      ) : (
        <p className="hidden min-w-0 flex-1 text-xs text-muted-foreground lg:block">Enter לשמירה · Esc לביטול</p>
      )}
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <IMButton type="button" variant="ghost" size="sm" disabled={isSaving} onClick={onCancel}>
          ביטול
        </IMButton>
        <IMButton type="submit" size="sm" disabled={!canSave || isSaving} className="min-w-28 gap-2">
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          שמירת שינויים
        </IMButton>
      </div>
    </footer>
  )
}
