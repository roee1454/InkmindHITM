import { beforeAll, describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import type { RecordModel } from 'pocketbase'
import { DEFAULT_PROJECT_POLICY, readProjectPolicySettings, toSettingsRecord } from '@/lib/project-policy'
import type { ProjectPolicySettings } from '@/lib/project-policy'
import { superuserClient } from './helpers/pocketbase'

vi.mock('@/features/settings/server/helpers.server', () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  getSettingsRecord: vi.fn(),
}))

const { loadProjectPolicy } = await import('@/features/settings/server/project-policy')

// 1786830090_project_policy_settings.js: every field optional, empty = not decided yet.
let pb: PocketBase
let settings: RecordModel

beforeAll(async () => {
  pb = await superuserClient()
  const existing = await pb.collection('settings').getList(1, 1)
  settings = existing.items[0] ?? (await pb.collection('settings').create({ studio_name: 'סטודיו בדיקה', timezone: 'Asia/Jerusalem', currency: 'ILS' }))
})

const DECIDED: ProjectPolicySettings = {
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
}

describe('project policy settings', () => {
  it('reads a studio that decided nothing yet as the pre-existing behaviour', async () => {
    const saved = await pb.collection('settings').update(settings.id, toSettingsRecord(readProjectPolicySettings(null)))

    expect(readProjectPolicySettings(saved)).toEqual(readProjectPolicySettings(null))
    expect(await loadProjectPolicy(pb)).toEqual(DEFAULT_PROJECT_POLICY)
  })

  it('stores every decision and reads it back unchanged', async () => {
    const saved = await pb.collection('settings').update(settings.id, toSettingsRecord(DECIDED))

    expect(readProjectPolicySettings(saved)).toEqual(DECIDED)
    expect(await loadProjectPolicy(pb)).toMatchObject({
      touchUp: { kind: 'free_within_days', days: 30 },
      depositPerSession: 'not_required',
      inquiryLostAfterDays: 10,
    })
  })

  it('rejects a value outside the allowed options', async () => {
    await expect(pb.collection('settings').update(settings.id, { deposit_application: 'middle_session' })).rejects.toMatchObject({ status: 400 })
  })
})
