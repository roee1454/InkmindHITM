import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Tattoo } from '@/components/ui/icon'
import { queryKeys } from '@/lib/query-keys'
import { formatIls } from '@/features/payments/utils/labels'
import { getConversationProject } from '@/features/projects/server/projects'
import { ProjectStageBadge } from '@/features/projects/components/ProjectStageBadge'
import { ProjectPanel } from '@/features/projects/components/ProjectPanel'
import { projectCardFact } from '@/features/projects/utils/board'

/**
 * Keyed under the customer-overview prefix: it is that overview, narrowed to one project, so every
 * project edit and milestone that refreshes an open customer card refreshes this chip too.
 */
export function conversationProjectQueryKey(conversationId: string) {
  return [...queryKeys.customers, 'overview', 'by-conversation', conversationId] as const
}

/**
 * The piece this conversation is about, under the header (track-b B8.3): name, stage, the board's
 * one-line fact ("session 2 of ~4 · next …") and what's owed. Whoever answers the customer sees the
 * context without leaving the thread; a tap opens the full project panel. Nothing renders while
 * loading or when the customer has no open project — the header keeps its height either way.
 */
export function ConversationProjectChip({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false)
  const { data: active } = useQuery({
    queryKey: conversationProjectQueryKey(conversationId),
    queryFn: () => getConversationProject({ data: { conversationId } }),
  })

  if (!active) return null
  const { project, otherOpen } = active

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-full cursor-pointer items-center gap-2 border-t border-border px-4 text-start text-xs transition-colors duration-150 hover:bg-muted/50"
        aria-label={`פרויקט ${project.title || 'ללא שם'} — פתיחת פרטי הפרויקט`}
      >
        <Tattoo size={14} className="shrink-0 text-muted-foreground" />
        <span className="max-w-[40%] shrink-0 truncate font-bold text-foreground">{project.title || 'פרויקט ללא שם'}</span>
        <ProjectStageBadge stage={project.stage} className="px-2" />
        <span className="min-w-0 truncate text-muted-foreground">{projectCardFact(project, new Date())}</span>
        {project.due > 0 && <span className="shrink-0 font-bold text-warning">יתרה {formatIls(project.due)}</span>}
        {otherOpen > 0 && (
          <span dir="ltr" className="shrink-0 text-muted-foreground" title={otherOpen === 1 ? 'ללקוח עוד פרויקט פתוח' : `ללקוח עוד ${otherOpen} פרויקטים פתוחים`}>
            +{otherOpen}
          </span>
        )}
        <ChevronLeft size={14} className="ms-auto shrink-0 text-muted-foreground" />
      </button>
      <ProjectPanel projectId={open ? project.projectId : null} onClose={() => setOpen(false)} />
    </>
  )
}
