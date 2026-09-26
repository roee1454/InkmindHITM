/**
 * When each project-level lifecycle step is due (track-b B5). Pure, with an injected "now", so the
 * timing is tested at any moment without touching the clock. The day counts come from the studio's
 * project policy (src/lib/project-policy.ts).
 */
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function ageMs(iso: string | null, now: Date): number {
  return iso ? now.getTime() - new Date(iso).getTime() : Number.NaN
}

/** Feedback goes out a few hours after the project is completed, and not after a week. */
export const FEEDBACK_AFTER_HOURS = 3
export const FEEDBACK_MAX_AGE_DAYS = 7

export function feedbackDue(completedAt: string | null, now: Date): boolean {
  const age = ageMs(completedAt, now)
  return age >= FEEDBACK_AFTER_HOURS * HOUR_MS && age <= FEEDBACK_MAX_AGE_DAYS * DAY_MS
}

/** The healing check for a session: during the last week of the healing period. */
export function healingCheckDue(sessionStart: string, healingPeriodDays: number, now: Date): boolean {
  const age = ageMs(sessionStart, now)
  return age >= Math.max(healingPeriodDays - 7, 1) * DAY_MS && age <= healingPeriodDays * DAY_MS
}

/**
 * Conversation states in the middle of a booking: a follow-up then would talk over the bot. Not
 * WANTS_TO_BOOK — that's where a finished consultation leaves the conversation, waiting for the customer.
 */
const MID_BOOKING = ['COLLECTING_INFO', 'WAITLIST', 'AWAIT_PRICE_OFFER', 'AWAIT_HEALTH_NOTICE', 'AWAIT_PAYMENT', 'AWAIT_FINAL_CONFIRMATION']

/**
 * The follow-up after a consultation: the project has sat in consultation_done for the configured
 * days, nothing is booked, and the customer isn't already booking with the bot. Stops after the
 * project would be marked lost.
 */
export function consultationFollowupDue(input: {
  stageChangedAt: string | null
  followupDays: number
  lostAfterDays: number
  conversationState: string | null
  hasUpcoming: boolean
  now: Date
}): boolean {
  if (input.hasUpcoming || (input.conversationState && MID_BOOKING.includes(input.conversationState))) return false
  const age = ageMs(input.stageChangedAt, input.now)
  return age >= input.followupDays * DAY_MS && age < input.lostAfterDays * DAY_MS
}

/**
 * Whether a project that stopped moving is lost for lack of response: an inquiry or a quote after
 * inquiryLostAfterDays, a finished consultation after consultationLostAfterDays. Measured from the
 * later of the last stage change and the last message, and never while something is booked or the
 * customer waits on the waitlist.
 */
export function staleProjectLost(input: {
  stage: string
  stageChangedAt: string | null
  lastMessageAt: string | null
  inquiryLostAfterDays: number
  consultationLostAfterDays: number
  hasUpcoming: boolean
  onWaitlist: boolean
  now: Date
}): boolean {
  if (input.hasUpcoming || input.onWaitlist) return false
  const limitDays =
    input.stage === 'inquiry' || input.stage === 'quoted'
      ? input.inquiryLostAfterDays
      : input.stage === 'consultation_done'
        ? input.consultationLostAfterDays
        : null
  if (limitDays === null) return false
  const lastActivity = Math.max(...[input.stageChangedAt, input.lastMessageAt].map((iso) => (iso ? new Date(iso).getTime() : 0)))
  return lastActivity > 0 && input.now.getTime() - lastActivity >= limitDays * DAY_MS
}

/** The daily staff digest: once a day, from this hour (studio time) on. */
export const STAFF_DIGEST_HOUR = 9

export function staffDigestDue(now: Date, lastSentAt: string | null, timeZone = 'Asia/Jerusalem'): boolean {
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(now))
  if (hour < STAFF_DIGEST_HOUR) return false
  return !lastSentAt || day(new Date(lastSentAt)) !== day(now)
}
