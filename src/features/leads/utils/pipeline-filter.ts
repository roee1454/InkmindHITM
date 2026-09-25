import type { PipelineProject, ProjectStage } from '@/features/projects/types'

/** The board's stage filter: a stage, every open project, or the customers without one. */
export type PipelineFilter = 'open' | ProjectStage | 'no_project'

const CLOSED: ProjectStage[] = ['completed', 'lost']

export const OPEN_STAGES: ProjectStage[] = ['inquiry', 'consultation_scheduled', 'consultation_done', 'quoted', 'booked', 'in_progress']

export function matchesStage(project: PipelineProject, filter: PipelineFilter): boolean {
  if (filter === 'no_project') return false
  if (filter === 'open') return !CLOSED.includes(project.stage)
  return project.stage === filter
}

export function countByFilter(projects: PipelineProject[], noProjectCount: number): Record<PipelineFilter, number> {
  const counts = { open: 0, no_project: noProjectCount } as Record<PipelineFilter, number>
  for (const stage of [...OPEN_STAGES, ...CLOSED]) counts[stage] = 0
  for (const project of projects) {
    counts[project.stage] += 1
    if (!CLOSED.includes(project.stage)) counts.open += 1
  }
  return counts
}
