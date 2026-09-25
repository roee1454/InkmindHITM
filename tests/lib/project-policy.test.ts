import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PROJECT_POLICY,
  PROJECT_POLICY_FIELDS,
  readProjectPolicySettings,
  resolveProjectPolicy,
  toSettingsRecord,
} from '@/lib/project-policy'
import type { ProjectPolicySettings } from '@/lib/project-policy'

const UNDECIDED: ProjectPolicySettings = {
  touchUpPolicy: null,
  touchUpFreeDays: null,
  depositApplication: null,
  depositPerSession: null,
  healingPeriodDays: null,
  consultationFollowupDays: null,
  consultationLostAfterDays: null,
  inquiryLostAfterDays: null,
  dormantAfterMonths: null,
  postProjectFeedback: null,
  easyReviewLink: null,
}

describe('readProjectPolicySettings', () => {
  it('treats a missing settings record as nothing decided yet', () => {
    expect(readProjectPolicySettings(null)).toEqual(UNDECIDED)
    expect(readProjectPolicySettings(undefined)).toEqual(UNDECIDED)
  })

  it('treats the empty values PocketBase stores as undecided', () => {
    const empty = Object.fromEntries(Object.values(PROJECT_POLICY_FIELDS).map((field) => [field, field.endsWith('link') ? '' : 0]))
    expect(readProjectPolicySettings({ ...empty, touch_up_policy: '', deposit_application: '' })).toEqual(UNDECIDED)
  })

  it('reads every decided value', () => {
    expect(
      readProjectPolicySettings({
        touch_up_policy: 'free_within_days',
        touch_up_free_days: 30,
        deposit_application: 'last_session',
        deposit_per_session: 'not_required',
        healing_period_days: 28,
        consultation_followup_days: 2,
        consultation_lost_after_days: 45,
        inquiry_lost_after_days: 10,
        dormant_after_months: 18,
        post_project_feedback: 'nps_then_review',
        easy_review_link: '  https://easy.co.il/page/1  ',
      }),
    ).toEqual({
      touchUpPolicy: 'free_within_days',
      touchUpFreeDays: 30,
      depositApplication: 'last_session',
      depositPerSession: 'not_required',
      healingPeriodDays: 28,
      consultationFollowupDays: 2,
      consultationLostAfterDays: 45,
      inquiryLostAfterDays: 10,
      dormantAfterMonths: 18,
      postProjectFeedback: 'nps_then_review',
      easyReviewLink: 'https://easy.co.il/page/1',
    })
  })

  it('rejects values outside the allowed options and ranges', () => {
    const settings = readProjectPolicySettings({
      touch_up_policy: 'sometimes',
      touch_up_free_days: 2.5,
      deposit_application: 'middle_session',
      healing_period_days: -3,
      inquiry_lost_after_days: 400,
      dormant_after_months: 121,
      consultation_followup_days: '3',
      easy_review_link: '   ',
    })
    expect(settings).toEqual(UNDECIDED)
  })
})

describe('resolveProjectPolicy', () => {
  it('falls back to how the system behaved before these settings existed', () => {
    expect(resolveProjectPolicy(UNDECIDED)).toEqual(DEFAULT_PROJECT_POLICY)
    expect(DEFAULT_PROJECT_POLICY).toMatchObject({
      touchUp: { kind: 'undecided' },
      depositApplication: 'first_session',
      depositPerSession: 'required',
      healingPeriodDays: 21,
      inquiryLostAfterDays: 7,
      postProjectFeedback: 'review_links',
    })
  })

  it('applies every decided value', () => {
    const policy = resolveProjectPolicy({
      ...UNDECIDED,
      touchUpPolicy: 'free_within_days',
      touchUpFreeDays: 45,
      depositApplication: 'last_session',
      depositPerSession: 'not_required',
      healingPeriodDays: 30,
      consultationFollowupDays: 5,
      consultationLostAfterDays: 60,
      inquiryLostAfterDays: 14,
      dormantAfterMonths: 24,
      postProjectFeedback: 'nps_then_review',
      easyReviewLink: 'https://easy.co.il/page/1',
    })
    expect(policy).toEqual({
      touchUp: { kind: 'free_within_days', days: 45 },
      depositApplication: 'last_session',
      depositPerSession: 'not_required',
      healingPeriodDays: 30,
      consultationFollowupDays: 5,
      consultationLostAfterDays: 60,
      inquiryLostAfterDays: 14,
      dormantAfterMonths: 24,
      postProjectFeedback: 'nps_then_review',
      easyReviewLink: 'https://easy.co.il/page/1',
    })
  })

  it('charges touch-ups when the studio says so', () => {
    expect(resolveProjectPolicy({ ...UNDECIDED, touchUpPolicy: 'charged', touchUpFreeDays: 30 }).touchUp).toEqual({ kind: 'charged' })
  })

  it('leaves a free touch-up window without a length with staff', () => {
    expect(resolveProjectPolicy({ ...UNDECIDED, touchUpPolicy: 'free_within_days' }).touchUp).toEqual({ kind: 'undecided' })
  })
})

describe('toSettingsRecord', () => {
  it('stores undecided values empty, so reading them back stays undecided', () => {
    const record = toSettingsRecord(UNDECIDED)
    expect(record).toMatchObject({ touch_up_policy: '', healing_period_days: 0, easy_review_link: '' })
    expect(readProjectPolicySettings(record)).toEqual(UNDECIDED)
  })

  it('round-trips decided values', () => {
    const decided: ProjectPolicySettings = {
      touchUpPolicy: 'charged',
      touchUpFreeDays: null,
      depositApplication: 'last_session',
      depositPerSession: 'required',
      healingPeriodDays: 21,
      consultationFollowupDays: 3,
      consultationLostAfterDays: 30,
      inquiryLostAfterDays: 7,
      dormantAfterMonths: 12,
      postProjectFeedback: 'review_links',
      easyReviewLink: 'https://easy.co.il/page/1',
    }
    expect(readProjectPolicySettings(toSettingsRecord(decided))).toEqual(decided)
  })
})
