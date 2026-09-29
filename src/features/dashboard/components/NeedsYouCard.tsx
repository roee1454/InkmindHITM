import { cn } from '@/lib/utils'
import { formatListTimestamp } from '@/features/conversations/utils/format'
import type { ProjectNeed, WaitingConversation } from '../utils/home'
import { HomeEmpty, HomeMoreRow, HomeRow, HomeRowsSkeleton, HomeSection } from './HomeSection'

/** Past this, the rest is one "more" row: the home screen points at work, the inbox and board hold it. */
const CAP = 4

interface NeedsYouCardProps {
  waiting: WaitingConversation[]
  projectNeeds: ProjectNeed[]
  isLoading: boolean
  onOpenConversation: (id: string) => void
  onOpenProject: (id: string) => void
  onAllConversations: () => void
  onAllProjects: () => void
}

function GroupLabel({ children }: { children: string }) {
  return <p className="border-t border-border/70 bg-muted/30 px-4 py-1.5 text-xs font-bold text-muted-foreground first:border-t-0 sm:px-5">{children}</p>
}

const dot = (className: string) => <span aria-hidden className={cn('size-2 shrink-0 rounded-full', className)} />

/**
 * Everything waiting on a person, in the words of the screen it lives on: conversations the bot
 * handed to staff (the inbox's reason), projects with a balance or that stopped moving (the board's
 * dot and card fact). Each row opens that exact conversation or project.
 */
export function NeedsYouCard({ waiting, projectNeeds, isLoading, onOpenConversation, onOpenProject, onAllConversations, onAllProjects }: NeedsYouCardProps) {
  const total = waiting.length + projectNeeds.length

  return (
    <HomeSection title="דורש אותך" count={total}>
      {isLoading ? (
        <HomeRowsSkeleton rows={4} />
      ) : total === 0 ? (
        <HomeEmpty title="אין כרגע משהו שמחכה לך" hint="שיחות שהבוט מעביר לצוות, יתרות פתוחות ופרויקטים שנתקעו יופיעו כאן." />
      ) : (
        <>
          {waiting.length > 0 && (
            <>
              <GroupLabel>שיחות</GroupLabel>
              {waiting.slice(0, CAP).map((c) => (
                <HomeRow
                  key={c.id}
                  onClick={() => onOpenConversation(c.id)}
                  lead={dot('bg-status-wait')}
                  title={c.name}
                  detail={c.reason}
                  trail={<span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatListTimestamp(c.lastMessageAt)}</span>}
                />
              ))}
              {waiting.length > CAP && <HomeMoreRow label={`עוד ${waiting.length - CAP} שיחות מחכות`} onClick={onAllConversations} />}
            </>
          )}
          {projectNeeds.length > 0 && (
            <>
              <GroupLabel>פרויקטים</GroupLabel>
              {projectNeeds.slice(0, CAP).map(({ project, attention, fact }) => (
                <HomeRow
                  key={project.projectId}
                  onClick={() => onOpenProject(project.projectId)}
                  lead={dot(attention === 'owes' ? 'bg-warning' : 'bg-status-wait')}
                  title={[project.customerName || project.customerPhone, project.title].filter(Boolean).join(' · ')}
                  detail={fact}
                />
              ))}
              {projectNeeds.length > CAP && <HomeMoreRow label={`עוד ${projectNeeds.length - CAP} פרויקטים בלוח`} onClick={onAllProjects} />}
            </>
          )}
        </>
      )}
    </HomeSection>
  )
}
