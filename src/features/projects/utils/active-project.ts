import type { PipelineProject } from '../types'

export interface ActiveProject {
  project: PipelineProject
  /** Other open pieces of the same customer, reachable from the customer card. */
  otherOpen: number
}

const isOpen = (p: PipelineProject) => p.stage !== 'completed' && p.stage !== 'lost'

/**
 * The piece a conversation is most likely about: among the customer's open projects, the one with
 * the soonest upcoming appointment, else the one whose stage moved last. Closed projects never
 * qualify — a returning customer's finished sleeve isn't what today's message is about.
 */
export function pickActiveProject(projects: PipelineProject[]): ActiveProject | null {
  const open = projects.filter(isOpen)
  if (open.length === 0) return null
  const [project] = [...open].sort((a, b) => {
    if (a.nextAppointmentAt && b.nextAppointmentAt) return a.nextAppointmentAt.localeCompare(b.nextAppointmentAt)
    if (a.nextAppointmentAt || b.nextAppointmentAt) return a.nextAppointmentAt ? -1 : 1
    return (b.stageChangedAt ?? '').localeCompare(a.stageChangedAt ?? '')
  })
  return { project: project!, otherOpen: open.length - 1 }
}
