import { createServerFn } from '@tanstack/react-start'
import type PocketBase from 'pocketbase'
import { z } from 'zod'
import {
  DEFAULT_PROJECT_POLICY,
  MAX_POLICY_DAYS,
  MAX_POLICY_MONTHS,
  readProjectPolicySettings,
  resolveProjectPolicy,
  toSettingsRecord,
} from '@/lib/project-policy'
import type { ProjectPolicy, ProjectPolicySettings } from '@/lib/project-policy'
import { getSettingsRecord, requireAdmin, requireAuth } from './helpers.server'

/**
 * The studio's project policy for server code that runs without a staff session (the lifecycle
 * tick, bot turns). A settings record that can't be read falls back to the defaults, which are how
 * the system behaved before these settings existed.
 */
export async function loadProjectPolicy(su: PocketBase): Promise<ProjectPolicy> {
  try {
    const list = await su.collection('settings').getList(1, 1)
    return resolveProjectPolicy(readProjectPolicySettings(list.items[0]))
  } catch (err) {
    console.error('[project-policy] reading settings failed, using defaults:', err)
    return DEFAULT_PROJECT_POLICY
  }
}

const days = z.number().int().min(1).max(MAX_POLICY_DAYS).nullable()

export const projectPolicySettingsSchema = z
  .object({
    touchUpPolicy: z.enum(['free_within_days', 'charged']).nullable(),
    touchUpFreeDays: days,
    depositApplication: z.enum(['first_session', 'last_session']).nullable(),
    depositPerSession: z.enum(['required', 'not_required']).nullable(),
    healingPeriodDays: days,
    consultationFollowupDays: days,
    consultationLostAfterDays: days,
    inquiryLostAfterDays: days,
    dormantAfterMonths: z.number().int().min(1).max(MAX_POLICY_MONTHS).nullable(),
    postProjectFeedback: z.enum(['review_links', 'nps_then_review']).nullable(),
    easyReviewLink: z.url().max(2000).nullable(),
  })
  .refine((s) => s.touchUpPolicy !== 'free_within_days' || s.touchUpFreeDays !== null, {
    message: 'יש להזין עד כמה ימים הטאץ׳-אפ חינם.',
    path: ['touchUpFreeDays'],
  }) satisfies z.ZodType<ProjectPolicySettings>

export const getProjectPolicySettings = createServerFn({ method: 'GET' }).handler(async (): Promise<ProjectPolicySettings> => {
  await requireAuth()
  const { record } = await getSettingsRecord()
  return readProjectPolicySettings(record)
})

export const saveProjectPolicySettings = createServerFn({ method: 'POST' })
  .validator(projectPolicySettingsSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')
    await su.collection('settings').update(record.id, toSettingsRecord(data))
    return { ok: true }
  })
