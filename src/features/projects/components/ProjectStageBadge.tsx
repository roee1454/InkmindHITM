import { cn } from '@/lib/utils'
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_TONE } from '../utils/labels'
import type { ProjectStage } from '../types'

export function ProjectStageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-2xs font-bold', PROJECT_STAGE_TONE[stage], className)}>
      {PROJECT_STAGE_LABELS[stage]}
    </span>
  )
}
