import { describe, expect, it } from 'vitest'
import { buildDynamicSystemPrompt, buildStaticSystemPrompt, getAllowedToolNames } from '@/integrations/ai/prompts'
import type { ConversationState } from '@/integrations/ai/prompts'
import { applyFactGuards, toConversationFacts } from '@/integrations/ai/tools/fact-guards'
import { toProjectPromptContext } from '@/integrations/ai/prompts/project-context'
import type { ProjectContextSource } from '@/integrations/ai/prompts/project-context'
import { formatCancellationSummaryHebrew } from '@/integrations/ai/studio-config.server'
import type { LedgerAppointment } from '@/features/payments/types'

/**
 * The B4 bot scenarios (docs/projects-payments/track-b-infrastructure.md, B4.5), checked at the
 * contract the model works from: the tools it is offered and what its prompt tells it. There is no
 * live-model eval harness in the repo; these run on every test run and catch a regression in what
 * the bot is given. The tool behaviour behind each one is covered against a real PocketBase in
 * tests/integration/booking-scope.test.ts, project-nps.test.ts and inbound-routing.test.ts.
 */
const now = new Date('2026-10-01T12:00:00')

const appt = (kind: LedgerAppointment['kind'], status: LedgerAppointment['status'], startTime: string): LedgerAppointment => ({
  id: `${kind}-${startTime}`,
  kind,
  status,
  startTime,
  finalPrice: status === 'completed' && kind === 'session' ? 1200 : null,
  chargeWaived: false,
})

function project(overrides: Partial<ProjectContextSource> = {}) {
  return toProjectPromptContext(
    {
      title: 'שרוול יפני',
      stage: 'in_progress',
      estimatedSessions: 3,
      quoteMin: 1200,
      quoteMax: 1500,
      appointments: [appt('session', 'completed', '2026-10-01T08:00:00')],
      payments: [],
      balance: { billed: 1200, paid: 1200, refunded: 0, due: 0, credit: 0 },
      healingPeriodDays: 21,
      touchUp: { kind: 'undecided' },
      depositApplication: 'first_session',
      ...overrides,
    },
    now,
  )
}

function turn(state: ConversationState, projectContext: ReturnType<typeof project> | null, appointments: Array<Record<string, unknown>> = []) {
  return {
    tools: applyFactGuards(getAllowedToolNames(state, false, null), toConversationFacts(appointments)),
    prompt: buildStaticSystemPrompt({ state, isEscalated: false }) + buildDynamicSystemPrompt({ projectContext, now }),
  }
}

describe('what the bot is given in the B4 scenarios', () => {
  it('session 2 of about 3: it knows where the work stands, from the artist estimate', () => {
    const { prompt } = turn('PROJECT_IN_PROGRESS', project())
    expect(prompt).toContain('הושלמו 1 סשנים מתוך כ-3 (הערכת האמן)')
    expect(prompt).toContain('מספר המפגשים וסיום העבודה נקבעים על ידי האמן בלבד')
  })

  it('after a consultation: no second consultation offered, the tattoo is booked', () => {
    const { tools, prompt } = turn('WANTS_TO_BOOK', project({ stage: 'consultation_done', appointments: [appt('consultation', 'completed', '2026-09-29T10:00:00')] }))
    expect(tools).toContain('choose_booking_track')
    expect(prompt).toContain('הלקוח כבר עבר פגישת ייעוץ בפרויקט הזה')
  })

  it('the next session: booked through start_booking, into the same project', () => {
    const { tools, prompt } = turn('PROJECT_IN_PROGRESS', project())
    expect(tools).toContain('start_booking')
    expect(prompt).toContain("'start_booking' עם scope 'next_session'")
  })

  it('a touch-up: booked with its own scope, and the policy is not promised while undecided', () => {
    const { prompt } = turn('COMPLETED', project({ stage: 'completed' }))
    expect(prompt).toContain("'start_booking' עם scope 'touch_up'")
    expect(prompt).not.toContain("טאץ'-אפ: ללא עלות")
  })

  it('a final-price question before the session is closed: no number', () => {
    expect(turn('PROJECT_IN_PROGRESS', project()).prompt).toContain('אין לך מידע על מחיר סופי: אל תנקוב בסכום')
  })

  it('a refund request: no promise either way', () => {
    expect(formatCancellationSummaryHebrew(48)).toContain('לעולם אל תקבע/י בעצמך מול הלקוח שהמקדמה חולטה')
  })

  it('"thanks for the tattoo" hours after a session: nothing to bring forward, cancel or move, and no push to book', () => {
    const { tools, prompt } = turn('PROJECT_IN_PROGRESS', project())
    expect(tools).not.toContain('flag_earlier_preference')
    expect(tools).not.toContain('request_cancel')
    expect(prompt).toContain('אל תציע לקבוע תור אם לא ביקש')
  })

  it('a feedback answer: recorded, not wiped', () => {
    expect(turn('AWAIT_NPS_SCORE', null).tools).toContain('record_nps_score')
  })

  it('the next session already booked by staff: answered, not offered again, and movable', () => {
    const booked = project({ appointments: [appt('session', 'completed', '2026-10-01T08:00:00'), appt('session', 'confirmed', '2026-10-22T11:00:00')] })
    const { tools, prompt } = turn('AWAITING_APPOINTMENT', booked, [{ status: 'confirmed', deposit_amount: 0 }])
    expect(prompt).toContain('הסשן הבא כבר נקבע: 2026-10-22 בשעה 11:00. אל תציע לקבוע אותו שוב.')
    expect(tools).toEqual(expect.arrayContaining(['request_reschedule', 'request_cancel', 'flag_earlier_preference']))
  })
})
