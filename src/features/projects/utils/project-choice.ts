import type { ProjectStage } from '../types'

export interface OpenProjectOption {
  id: string
  title: string
  stage: ProjectStage
}

/**
 * Which project a new appointment joins unless staff pick otherwise: the one piece under way
 * (a multi-session tattoo between sessions), or a new project. With more than one piece under way,
 * or none, guessing could merge two tattoos, so staff choose.
 */
export function defaultProjectChoice(openProjects: readonly OpenProjectOption[]): string | null {
  const underWay = openProjects.filter((p) => p.stage === 'in_progress')
  return underWay.length === 1 ? (underWay[0]?.id ?? null) : null
}
