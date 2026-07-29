import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth, requireAdmin, getSettingsRecord } from './helpers.server'

export interface StudioPolicySettings {
  paymentInstructions: string | null
  reviewLink: string | null
  cancellationCutoffHours: number
  staffNotificationPhone: string | null
  defaultSessionDurationHours: number
}

export interface BotStudioPolicy extends StudioPolicySettings {
  depositRequired: boolean
  depositAmount: number | null
}

/** Superuser-context studio policy lookup for bot tools (`wait_for_payment`, `request_cancel`,
 *  `record_nps_score`) — a webhook-triggered turn has no staff session to gate on. Includes the
 *  deposit fields that the staff-facing `getStudioPolicySettings` below doesn't expose, since
 *  those aren't shown anywhere in the policy UI but the bot needs them to tell a client how
 *  much to pay. */
export async function getStudioPolicyForBot(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
): Promise<BotStudioPolicy> {
  const list = await su.collection('settings').getList(1, 1)
  const record = list.items[0]
  return {
    paymentInstructions: (record?.payment_instructions as string) || null,
    reviewLink: (record?.google_review_link as string) || null,
    cancellationCutoffHours: (record?.cancellation_cutoff_hours as number) ?? 48,
    staffNotificationPhone: (record?.staff_notification_phone as string) || null,
    defaultSessionDurationHours: (record?.default_session_duration_hours as number) ?? 2,
    depositRequired: Boolean(record?.deposit_required),
    depositAmount: (record?.deposit_amount as number) ?? null,
  }
}

export const getStudioPolicySettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudioPolicySettings> => {
    await requireAuth()
    const { record } = await getSettingsRecord()
    return {
      paymentInstructions: (record?.payment_instructions as string) || null,
      reviewLink: (record?.google_review_link as string) || null,
      cancellationCutoffHours: (record?.cancellation_cutoff_hours as number) ?? 48,
      staffNotificationPhone: (record?.staff_notification_phone as string) || null,
      defaultSessionDurationHours: (record?.default_session_duration_hours as number) ?? 2,
    }
  },
)

const saveStudioPolicySchema = z.object({
  paymentInstructions: z.string().optional(),
  reviewLink: z.string().optional(),
  cancellationCutoffHours: z.number().min(0),
  staffNotificationPhone: z.string().optional(),
  defaultSessionDurationHours: z.number().min(0.5),
})

export const saveStudioPolicySettings = createServerFn({ method: 'POST' })
  .validator(saveStudioPolicySchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const { su, record } = await getSettingsRecord()
    if (!record) throw new Error('רשומת ההגדרות חסרה.')

    await su.collection('settings').update(record.id, {
      payment_instructions: data.paymentInstructions || '',
      google_review_link: data.reviewLink || '',
      cancellation_cutoff_hours: data.cancellationCutoffHours,
      staff_notification_phone: data.staffNotificationPhone || '',
      default_session_duration_hours: data.defaultSessionDurationHours,
    })
    return { ok: true }
  })

export interface StudioClosure {
  date: string
  reason: string | null
}

export const getStudioClosures = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudioClosure[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('studio_closures').getFullList({ sort: 'date' })

    return list.map((item) => {
      const rawDate = (item.date as string) || ''
      const formattedDate = rawDate.includes('T') ? rawDate.split('T')[0] ?? rawDate : rawDate
      return {
        date: formattedDate,
        reason: (item.reason as string) || null,
      }
    })
  },
)

const addClosureSchema = z.object({
  date: z.string().min(1, 'תאריך חובה'),
  reason: z.string().optional(),
})

export const addStudioClosure = createServerFn({ method: 'POST' })
  .validator(addClosureSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const created = await su.collection('studio_closures').create({
      date: data.date,
      reason: data.reason || '',
    })
    return { id: created.id, date: created.date as string, reason: (created.reason as string) || null }
  })

const deleteClosureSchema = z.object({
  date: z.string(),
})

export const deleteStudioClosure = createServerFn({ method: 'POST' })
  .validator(deleteClosureSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const list = await su.collection('studio_closures').getList(1, 10, {
      filter: `date ~ "${data.date}"`,
    })
    for (const item of list.items) {
      await su.collection('studio_closures').delete(item.id)
    }
    return { ok: true }
  })
