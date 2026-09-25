import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { EllipsisVertical, MessageSquare } from '@/components/ui/icon'
import type { PipelineProject } from '@/features/projects/types'

interface PipelineRowActionsProps {
  project: PipelineProject
  onMarkLost: (project: PipelineProject) => void
  onReopen: (project: PipelineProject) => void
  onOpenProject: (project: PipelineProject) => void
}

/** Open the chat, and the few things staff decide by hand: lost, reopen, the project panel. */
export function PipelineRowActions({ project, onMarkLost, onReopen, onOpenProject }: PipelineRowActionsProps) {
  const navigate = useNavigate()
  const closed = project.stage === 'lost' || project.stage === 'completed'

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!project.conversationId}
        onClick={() => project.conversationId && navigate({ to: '/dashboard/conversations', search: { chatId: project.conversationId } })}
        className="h-9 gap-1.5 px-3 text-primary"
      >
        <MessageSquare className="size-4" />
        <span className="hidden sm:inline">שיחה</span>
      </Button>
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="פעולות על הפרויקט">
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onOpenProject(project)}>פרטי הפרויקט</DropdownMenuItem>
          {closed ? (
            <DropdownMenuItem onSelect={() => onReopen(project)}>פתיחה מחדש</DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onMarkLost(project)} className="text-destructive">
              סימון כאבוד
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
