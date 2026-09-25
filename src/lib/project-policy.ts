/**
 * How the studio runs a project: touch-ups, deposits across sessions, healing time, follow-ups,
 * when a quiet lead counts as lost. Several of these are the studio's call and still open
 * (docs/projects-payments/track-a-after-client-call.md, part 1), so the stored settings keep
 * "not decided yet" as null and every consumer reads the resolved policy, whose defaults are
 * exactly how the system behaved before these settings existed.
 */

export type TouchUpPolicy = 'free_within_days' | 'charged'
export type DepositApplication = 'first_session' | 'last_session'
export type DepositPerSession = 'required' | 'not_required'
export type PostProjectFeedback = 'review_links' | 'nps_then_review'

/** What the studio decided. null = not decided yet. */
export interface ProjectPolicySettings {
  touchUpPolicy: TouchUpPolicy | null
  touchUpFreeDays: number | null
  depositApplication: DepositApplication | null
  depositPerSession: DepositPerSession | null
  healingPeriodDays: number | null
  consultationFollowupDays: number | null
  consultationLostAfterDays: number | null
  inquiryLostAfterDays: number | null
  dormantAfterMonths: number | null
  postProjectFeedback: PostProjectFeedback | null
  easyReviewLink: string | null
}

export type TouchUpRule =
  | { kind: 'undecided' }
  | { kind: 'free_within_days'; days: number }
  | { kind: 'charged' }

/** The policy every consumer applies. */
export interface ProjectPolicy {
  /** Undecided: every touch-up request goes to staff. */
  touchUp: TouchUpRule
  /** Which session a deposit is suggested against when closing a multi-session project. */
  depositApplication: DepositApplication
  /** Undecided behaves as `required`: every booking goes through pricing and a deposit. */
  depositPerSession: DepositPerSession
  healingPeriodDays: number
  consultationFollowupDays: number
  consultationLostAfterDays: number
  inquiryLostAfterDays: number
  dormantAfterMonths: number
  postProjectFeedback: PostProjectFeedback
  easyReviewLink: string | null
}

export const MAX_POLICY_DAYS = 365
export const MAX_POLICY_MONTHS = 120

export const DEFAULT_PROJECT_POLICY: ProjectPolicy = {
  touchUp: { kind: 'undecided' },
  depositApplication: 'first_session',
  depositPerSession: 'required',
  healingPeriodDays: 21,
  consultationFollowupDays: 3,
  consultationLostAfterDays: 30,
  inquiryLostAfterDays: 7,
  dormantAfterMonths: 12,
  postProjectFeedback: 'review_links',
  easyReviewLink: null,
}

/** The `settings` record field behind each setting. */
export const PROJECT_POLICY_FIELDS: Record<keyof ProjectPolicySettings, string> = {
  touchUpPolicy: 'touch_up_policy',
  touchUpFreeDays: 'touch_up_free_days',
  depositApplication: 'deposit_application',
  depositPerSession: 'deposit_per_session',
  healingPeriodDays: 'healing_period_days',
  consultationFollowupDays: 'consultation_followup_days',
  consultationLostAfterDays: 'consultation_lost_after_days',
  inquiryLostAfterDays: 'inquiry_lost_after_days',
  dormantAfterMonths: 'dormant_after_months',
  postProjectFeedback: 'post_project_feedback',
  easyReviewLink: 'easy_review_link',
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((option) => option === value) ?? null
}

/** PocketBase stores an empty number as 0, which is never a meaningful period here. */
function count(value: unknown, max: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max ? value : null
}

function nonEmpty(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Reads the stored settings, treating anything missing or out of range as not decided. */
export function readProjectPolicySettings(record: Record<string, unknown> | null | undefined): ProjectPolicySettings {
  const field = (key: keyof ProjectPolicySettings) => record?.[PROJECT_POLICY_FIELDS[key]]
  return {
    touchUpPolicy: oneOf(field('touchUpPolicy'), ['free_within_days', 'charged'] as const),
    touchUpFreeDays: count(field('touchUpFreeDays'), MAX_POLICY_DAYS),
    depositApplication: oneOf(field('depositApplication'), ['first_session', 'last_session'] as const),
    depositPerSession: oneOf(field('depositPerSession'), ['required', 'not_required'] as const),
    healingPeriodDays: count(field('healingPeriodDays'), MAX_POLICY_DAYS),
    consultationFollowupDays: count(field('consultationFollowupDays'), MAX_POLICY_DAYS),
    consultationLostAfterDays: count(field('consultationLostAfterDays'), MAX_POLICY_DAYS),
    inquiryLostAfterDays: count(field('inquiryLostAfterDays'), MAX_POLICY_DAYS),
    dormantAfterMonths: count(field('dormantAfterMonths'), MAX_POLICY_MONTHS),
    postProjectFeedback: oneOf(field('postProjectFeedback'), ['review_links', 'nps_then_review'] as const),
    easyReviewLink: nonEmpty(field('easyReviewLink')),
  }
}

function touchUpRule(settings: ProjectPolicySettings): TouchUpRule {
  if (settings.touchUpPolicy === 'charged') return { kind: 'charged' }
  // A free window without a length can't be applied, so it stays with staff.
  if (settings.touchUpPolicy === 'free_within_days' && settings.touchUpFreeDays !== null) {
    return { kind: 'free_within_days', days: settings.touchUpFreeDays }
  }
  return { kind: 'undecided' }
}

export function resolveProjectPolicy(settings: ProjectPolicySettings): ProjectPolicy {
  const d = DEFAULT_PROJECT_POLICY
  return {
    touchUp: touchUpRule(settings),
    depositApplication: settings.depositApplication ?? d.depositApplication,
    depositPerSession: settings.depositPerSession ?? d.depositPerSession,
    healingPeriodDays: settings.healingPeriodDays ?? d.healingPeriodDays,
    consultationFollowupDays: settings.consultationFollowupDays ?? d.consultationFollowupDays,
    consultationLostAfterDays: settings.consultationLostAfterDays ?? d.consultationLostAfterDays,
    inquiryLostAfterDays: settings.inquiryLostAfterDays ?? d.inquiryLostAfterDays,
    dormantAfterMonths: settings.dormantAfterMonths ?? d.dormantAfterMonths,
    postProjectFeedback: settings.postProjectFeedback ?? d.postProjectFeedback,
    easyReviewLink: settings.easyReviewLink,
  }
}

/** The settings as `settings` record fields; undecided values are stored empty (0 for numbers). */
export function toSettingsRecord(settings: ProjectPolicySettings): Record<string, string | number> {
  const f = PROJECT_POLICY_FIELDS
  return {
    [f.touchUpPolicy]: settings.touchUpPolicy ?? '',
    [f.touchUpFreeDays]: settings.touchUpFreeDays ?? 0,
    [f.depositApplication]: settings.depositApplication ?? '',
    [f.depositPerSession]: settings.depositPerSession ?? '',
    [f.healingPeriodDays]: settings.healingPeriodDays ?? 0,
    [f.consultationFollowupDays]: settings.consultationFollowupDays ?? 0,
    [f.consultationLostAfterDays]: settings.consultationLostAfterDays ?? 0,
    [f.inquiryLostAfterDays]: settings.inquiryLostAfterDays ?? 0,
    [f.dormantAfterMonths]: settings.dormantAfterMonths ?? 0,
    [f.postProjectFeedback]: settings.postProjectFeedback ?? '',
    [f.easyReviewLink]: settings.easyReviewLink ?? '',
  }
}
