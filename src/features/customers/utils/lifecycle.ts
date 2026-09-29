import type { StatusRole } from '@/components/ui/status-label'
import type { ProjectStage } from '@/features/projects/types'

/**
 * Where a customer stands with the studio, derived from their projects every time it's read —
 * never stored, so it can't drift the way `lead_stage` (a copy of the bot's dialogue state) did.
 * - lead: only inquiries (or nothing, or inquiries that went nowhere)
 * - prospect: something concrete is in motion — a consultation, a quote, a booked session
 * - client: had at least one session
 * - returning: came back for another piece after a session
 * - dormant: a client whose last session is long ago and who has nothing open
 */
export type CustomerLifecycle = 'lead' | 'prospect' | 'client' | 'returning' | 'dormant'

export interface LifecycleProject {
  stage: ProjectStage
  createdAt: string
  /** Completed sessions only (not consultations or touch-ups). */
  sessionDates: string[]
}

const IN_MOTION: ProjectStage[] = ['consultation_scheduled', 'consultation_done', 'quoted', 'booked', 'in_progress']
const CLOSED: ProjectStage[] = ['completed', 'lost']

function time(iso: string): number {
  return new Date(iso).getTime()
}

export function deriveCustomerLifecycle(projects: LifecycleProject[], now: Date, dormantAfterMonths: number): CustomerLifecycle {
  const sessions = projects.flatMap((p) => p.sessionDates).map(time).sort((a, b) => a - b)
  const firstSession = sessions[0]
  const lastSession = sessions[sessions.length - 1]
  if (firstSession === undefined || lastSession === undefined) {
    return projects.some((p) => IN_MOTION.includes(p.stage)) ? 'prospect' : 'lead'
  }

  const clientProjects = projects.filter((p) => p.sessionDates.length > 0)
  const cameBack = projects.some((p) => p.sessionDates.length === 0 && !CLOSED.includes(p.stage) && time(p.createdAt) > firstSession)
  if (cameBack) return 'returning'

  const hasOpenProject = projects.some((p) => !CLOSED.includes(p.stage))
  const dormantSince = new Date(now)
  dormantSince.setMonth(dormantSince.getMonth() - dormantAfterMonths)
  if (!hasOpenProject && lastSession < dormantSince.getTime()) return 'dormant'

  return clientProjects.length > 1 ? 'returning' : 'client'
}

export const CUSTOMER_LIFECYCLE_LABELS: Record<CustomerLifecycle, string> = {
  lead: 'ליד',
  prospect: 'בתהליך',
  client: 'לקוח',
  returning: 'לקוח חוזר',
  dormant: 'רדום',
}

export const CUSTOMER_LIFECYCLE_ROLE: Record<CustomerLifecycle, StatusRole> = {
  lead: 'new',
  prospect: 'wait',
  client: 'done',
  returning: 'done',
  dormant: 'dead',
}
