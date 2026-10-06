import { useNavigate } from '@tanstack/react-router'
import { MessageSquare } from '@/components/ui/icon'
import { cn } from '@/lib/utils'
import { ArtistBadge } from '@/features/calendar/components/ArtistBadge'
import { formatIls } from '@/features/payments/utils/labels'
import { ATTENTION_LABELS, projectAttention, projectCardFact } from '../utils/board'
import type { PipelineProject } from '../types'

interface ProjectCardProps {
  project: PipelineProject
  now: Date
  avatarUrl?: string | null
  onOpen: () => void
}

/**
 * One piece of work on the projects board (track-b B6.10): who it's for, who's doing it, and the
 * single fact that matters at this stage. Opening it brings up the project panel, where the
 * lifecycle actions (lost, reopen, complete) live — the card itself stays a glance.
 */
export function ProjectCard({ project, now, avatarUrl, onOpen }: ProjectCardProps) {
  const navigate = useNavigate()
  const attention = projectAttention(project, now)

  return (
    <div className="group relative rounded-lg border border-border bg-card transition-colors duration-150 hover:border-accent-ink/40">
      <button type="button" onClick={onOpen} className="flex w-full cursor-pointer flex-col gap-1 p-3 text-right">
        <span className="flex min-w-0 items-center gap-2">
          <ArtistBadge staffId={project.staffId} staffName={project.staffName} avatarUrl={avatarUrl} size={18} />
          <span className="truncate text-sm font-extrabold text-foreground">{project.customerName || 'לקוח ללא שם'}</span>
          {attention && (
            <span
              title={ATTENTION_LABELS[attention]}
              aria-label={ATTENTION_LABELS[attention]}
              className={cn('ms-auto size-2 shrink-0 rounded-full', attention === 'owes' ? 'bg-warning' : 'bg-status-wait')}
            />
          )}
        </span>
        {project.title && <span className="truncate text-xs text-muted-foreground">{project.title}</span>}
        {/* Two lines, not one: "2 of ~3 sessions · next Sat 3.10 · 11:00" is the whole point of the
            card, and truncating it cut off the time. */}
        <span className="line-clamp-2 pe-7 text-xs font-semibold text-foreground/80">{projectCardFact(project, now)}</span>
        {project.due > 0 && <span className="text-2xs font-bold text-warning">יתרה {formatIls(project.due)}</span>}
      </button>

      {project.conversationId && (
        <button
          type="button"
          onClick={() => navigate({ to: '/dashboard/conversations', search: { chatId: project.conversationId! } })}
          title="לשיחה"
          aria-label={`לשיחה עם ${project.customerName || 'הלקוח'}`}
          className="absolute bottom-2 end-2 flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity duration-150 hover:bg-muted hover:text-foreground group-hover:opacity-100"
        >
          <MessageSquare size={14} />
        </button>
      )}
    </div>
  )
}
