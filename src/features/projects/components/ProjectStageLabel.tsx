import { StatusLabel } from '@/components/ui/status-label'
import { PROJECT_STAGE_LABELS, PROJECT_STAGE_ROLE } from '../utils/labels'
import type { ProjectStage } from '../types'

export function ProjectStageLabel({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <StatusLabel role={PROJECT_STAGE_ROLE[stage]} className={className}>
      {PROJECT_STAGE_LABELS[stage]}
    </StatusLabel>
  )
}
