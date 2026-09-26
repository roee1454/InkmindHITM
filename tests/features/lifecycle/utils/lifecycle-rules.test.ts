import { describe, expect, it } from 'vitest'
import { consultationFollowupDue, feedbackDue, healingCheckDue, staffDigestDue, staleProjectLost } from '@/features/lifecycle/utils/lifecycle-rules'
import { triggerSent, withTriggerSent } from '@/features/lifecycle/utils/triggers'

const now = new Date('2026-10-10T12:00:00Z')
const ago = (days: number, hours = 0) => new Date(now.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString()

describe('feedbackDue', () => {
  it('waits a few hours after the project is completed, and gives up after a week', () => {
    expect(feedbackDue(ago(0, 1), now)).toBe(false)
    expect(feedbackDue(ago(0, 4), now)).toBe(true)
    expect(feedbackDue(ago(6), now)).toBe(true)
    expect(feedbackDue(ago(8), now)).toBe(false)
    expect(feedbackDue(null, now)).toBe(false)
  })
})

describe('healingCheckDue', () => {
  it('falls in the last week of the healing period', () => {
    expect(healingCheckDue(ago(13), 21, now)).toBe(false)
    expect(healingCheckDue(ago(14), 21, now)).toBe(true)
    expect(healingCheckDue(ago(21), 21, now)).toBe(true)
    expect(healingCheckDue(ago(22), 21, now)).toBe(false)
  })
})

describe('consultationFollowupDue', () => {
  const base = { stageChangedAt: ago(4), followupDays: 3, lostAfterDays: 30, conversationState: 'COMPLETED', hasUpcoming: false, now }

  it('follows up once the configured days passed with nothing booked', () => {
    expect(consultationFollowupDue(base)).toBe(true)
    expect(consultationFollowupDue({ ...base, stageChangedAt: ago(2) })).toBe(false)
  })

  it('still follows up while the conversation waits in "wants to book", where the consultation left it', () => {
    expect(consultationFollowupDue({ ...base, conversationState: 'WANTS_TO_BOOK' })).toBe(true)
  })

  it('stays quiet while the customer is booking, has something booked, or the project is about to be lost', () => {
    expect(consultationFollowupDue({ ...base, conversationState: 'COLLECTING_INFO' })).toBe(false)
    expect(consultationFollowupDue({ ...base, hasUpcoming: true })).toBe(false)
    expect(consultationFollowupDue({ ...base, stageChangedAt: ago(31) })).toBe(false)
  })
})

describe('staleProjectLost', () => {
  const base = { stage: 'inquiry', stageChangedAt: ago(8), lastMessageAt: ago(8), inquiryLostAfterDays: 7, consultationLostAfterDays: 30, hasUpcoming: false, onWaitlist: false, now }

  it('loses an inquiry or a quote that got no response', () => {
    expect(staleProjectLost(base)).toBe(true)
    expect(staleProjectLost({ ...base, stage: 'quoted' })).toBe(true)
  })

  it('counts from the last message too, so a customer still talking keeps the project', () => {
    expect(staleProjectLost({ ...base, lastMessageAt: ago(2) })).toBe(false)
  })

  it('gives a finished consultation longer', () => {
    expect(staleProjectLost({ ...base, stage: 'consultation_done' })).toBe(false)
    expect(staleProjectLost({ ...base, stage: 'consultation_done', stageChangedAt: ago(31), lastMessageAt: ago(31) })).toBe(true)
  })

  it('never loses a project with something booked, one on the waitlist, or one past the quote', () => {
    expect(staleProjectLost({ ...base, hasUpcoming: true })).toBe(false)
    expect(staleProjectLost({ ...base, onWaitlist: true })).toBe(false)
    expect(staleProjectLost({ ...base, stage: 'in_progress' })).toBe(false)
  })
})

describe('staffDigestDue', () => {
  it('goes out once a day, from the morning (studio time)', () => {
    expect(staffDigestDue(new Date('2026-10-10T04:00:00Z'), null)).toBe(false) // 07:00 in Israel
    expect(staffDigestDue(new Date('2026-10-10T07:00:00Z'), null)).toBe(true) // 10:00
    expect(staffDigestDue(new Date('2026-10-10T12:00:00Z'), '2026-10-10T07:00:00Z')).toBe(false)
    expect(staffDigestDue(new Date('2026-10-11T07:00:00Z'), '2026-10-10T07:00:00Z')).toBe(true)
  })
})

describe('triggers', () => {
  it('reads both the old string and the object shape, and appends', () => {
    expect(triggerSent(['reminder_3d'], 'reminder_3d')).toBe(true)
    expect(triggerSent([{ trigger: 'feedback', sent_at: 'x' }], 'feedback')).toBe(true)
    expect(triggerSent(null, 'feedback')).toBe(false)
    expect(withTriggerSent(null, 'feedback', 't')).toEqual([{ trigger: 'feedback', sent_at: 't' }])
  })
})
