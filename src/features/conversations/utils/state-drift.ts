import type { ConversationState } from '@/integrations/ai/prompts'
import type { InboundFacts } from './inbound-routing'

/**
 * A conversation whose dialogue state contradicts the facts — a hold deleted by staff in the
 * calendar, a booking confirmed by hand, a project closed while the customer waits between sessions,
 * a partial failure somewhere. The lifecycle reconciler (reconciler.server.ts) looks for these on
 * every tick and corrects them through transition(), telling staff each time, so a bug that causes
 * drift shows up instead of leaving the bot stuck in the wrong step.
 */
export interface DriftFacts {
  /** Pending and confirmed appointments that started less than a day ago or later. */
  openAppointments: Array<{ status: 'pending' | 'confirmed'; startsAt: string }>
  activeProject: InboundFacts['activeProject']
  /** When the conversation entered its current state (state_transitions); null when unknown. */
  stateEnteredAt: string | null
}

export interface DriftCorrection {
  /** The state to move to; null when only the project needs detaching. */
  to: ConversationState | null
  clearProject: boolean
  reason: string
}

/** A state younger than this is left alone: the flow that set it may still be finishing. */
export const DRIFT_GRACE_MINUTES = 30

const HOLD_FLOW_STATES: ConversationState[] = ['AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION']
const BOOKING_STATES: ConversationState[] = ['WANTS_TO_BOOK', 'COLLECTING_INFO', 'WAITLIST']

/** The states the reconciler has rules for, so the loader only reads those conversations. */
export const RECONCILED_STATES: ConversationState[] = [...HOLD_FLOW_STATES, ...BOOKING_STATES, 'AWAITING_APPOINTMENT', 'PROJECT_IN_PROGRESS']

function move(to: ConversationState, reason: string): DriftCorrection {
  return { to, clearProject: false, reason }
}

function afterNothingBooked(project: DriftFacts['activeProject']): DriftCorrection {
  if (project && !project.closed && project.lastFinishedKind === 'consultation') return move('WANTS_TO_BOOK', 'reconciler_nothing_booked')
  if (project && !project.closed && project.lastFinishedKind !== null) return move('PROJECT_IN_PROGRESS', 'reconciler_nothing_booked')
  return move('COMPLETED', 'reconciler_nothing_booked')
}

export function detectStateDrift(input: {
  state: ConversationState
  hasActiveProject: boolean
  facts: DriftFacts
  now: Date
  /** 0 right after a change staff made themselves: nothing of theirs is still in flight. */
  graceMinutes?: number
}): DriftCorrection | null {
  const { state, facts, now } = input
  const graceMinutes = input.graceMinutes ?? DRIFT_GRACE_MINUTES
  const entered = facts.stateEnteredAt ? new Date(facts.stateEnteredAt).getTime() : NaN
  if (!Number.isNaN(entered) && now.getTime() - entered < graceMinutes * 60_000) return null

  const project = facts.activeProject
  const hasPending = facts.openAppointments.some((a) => a.status === 'pending')
  const hasConfirmed = facts.openAppointments.some((a) => a.status === 'confirmed')

  if (HOLD_FLOW_STATES.includes(state)) {
    if (hasPending) return null
    // The hold is gone: confirmed by hand, or deleted, cancelled or expired.
    return hasConfirmed ? move('AWAITING_APPOINTMENT', 'reconciler_booking_confirmed') : move('COLLECTING_INFO', 'reconciler_hold_gone')
  }
  if (state === 'AWAITING_APPOINTMENT') return facts.openAppointments.length > 0 ? null : afterNothingBooked(project)
  if (state === 'PROJECT_IN_PROGRESS') {
    // Staff booked the next session themselves (right after closing this one, say). Only an
    // appointment that hasn't started counts: one under way is still the session that just ended.
    if (facts.openAppointments.some((a) => a.status === 'confirmed' && new Date(a.startsAt).getTime() > now.getTime())) {
      return move('AWAITING_APPOINTMENT', 'reconciler_session_booked')
    }
    return !project || project.closed ? move('COMPLETED', 'reconciler_project_closed') : null
  }
  if (BOOKING_STATES.includes(state) && input.hasActiveProject && (!project || project.closed)) {
    // A new booking must not land in a finished or lost project.
    return { to: null, clearProject: true, reason: 'reconciler_project_closed' }
  }
  return null
}
