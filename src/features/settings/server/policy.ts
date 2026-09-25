import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth, requireAdmin, getSettingsRecord } from './helpers.server'

export interface StudioPolicySettings {
  paymentInstructions: string | null
  reviewLink: string | null
  cancellationCutoffHours: number
  healthDeclarationFormUrl?: string | null
  healthDeclarationValidityMonths?: number
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
  const col = su.collection('settings')
  const list = typeof col?.getList === 'function' ? await col.getList(1, 1).catch(() => ({ items: [] })) : { items: [] }
  const record = list?.items?.[0]
  return {
    paymentInstructions: (record?.payment_instructions as string) || null,
    reviewLink: (record?.google_review_link as string) || null,
    // Preserves 0 hours when studio policy permits free cancellation anytime (Bug 20)
    cancellationCutoffHours:
      typeof record?.cancellation_cutoff_hours === 'number'
        ? (record.cancellation_cutoff_hours)
        : 48,
    depositRequired: Boolean(record?.deposit_required),
    depositAmount: (record?.deposit_amount as number) ?? null,
    healthDeclarationFormUrl: (record?.health_declaration_form_url as string) || null,
    healthDeclarationValidityMonths:
      typeof record?.health_declaration_validity_months === 'number'
        ? (record.health_declaration_validity_months)
        : 6,
  }
}

export const getStudioPolicySettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StudioPolicySettings> => {
    await requireAuth()
    const { record } = await getSettingsRecord()
    return {
      paymentInstructions: (record?.payment_instructions as string) || null,
      reviewLink: (record?.google_review_link as string) || null,
      cancellationCutoffHours:
        typeof record?.cancellation_cutoff_hours === 'number'
          ? (record.cancellation_cutoff_hours)
          : 48,
      healthDeclarationFormUrl: (record?.health_declaration_form_url as string) || null,
      healthDeclarationValidityMonths:
        typeof record?.health_declaration_validity_months === 'number'
          ? (record.health_declaration_validity_months)
          : 6,
    }
  },
)

export const saveStudioPolicySchema = z.object({
  paymentInstructions: z.string().optional(),
  reviewLink: z.string().optional(),
  cancellationCutoffHours: z.number().min(0),
  healthDeclarationFormUrl: z.string().optional().nullable(),
  healthDeclarationValidityMonths: z.number().default(6),
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
      health_declaration_form_url: data.healthDeclarationFormUrl || '',
      health_declaration_validity_months: data.healthDeclarationValidityMonths ?? 6,
    })
    return { ok: true }
  })

// Studio closures moved to ./closures.ts (getStudioClosures/addStudioClosure/
// deleteStudioClosure/getHebcalHolidays/isStudioClosedOn) — enough surface area now
// (Hebcal integration, recurring-date matching) to warrant its own domain file.
