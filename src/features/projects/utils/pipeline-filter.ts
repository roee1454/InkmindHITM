import type { PipelineProject, ProjectStage } from '@/features/projects/types'

/** The projects pipeline's stage filter: a stage, or every open project. Leads without a
 *  project live on their own page (track-b B6.7), not as a filter here. */
export type PipelineFilter = 'open' | ProjectStage

const CLOSED: ProjectStage[] = ['completed', 'lost']

export const OPEN_STAGES: ProjectStage[] = ['inquiry', 'consultation_scheduled', 'consultation_done', 'quoted', 'booked', 'in_progress']

export function matchesStage(project: PipelineProject, filter: PipelineFilter): boolean {
  if (filter === 'open') return !CLOSED.includes(project.stage)
  return project.stage === filter
}

export function countByFilter(projects: PipelineProject[]): Record<PipelineFilter, number> {
  const counts = { open: 0 } as Record<PipelineFilter, number>
  for (const stage of [...OPEN_STAGES, ...CLOSED]) counts[stage] = 0
  for (const project of projects) {
    counts[project.stage] += 1
    if (!CLOSED.includes(project.stage)) counts.open += 1
  }
  return counts
}
