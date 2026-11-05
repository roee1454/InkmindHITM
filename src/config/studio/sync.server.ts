import type PocketBase from 'pocketbase'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { studioConfig } from '../studio.config'

/**
 * Synchronizes the developer-defined `studio.config.ts` into the PocketBase `settings` singleton record
 * and initial seeds (e.g. FAQ knowledge base).
 *
 * This provides smooth, idempotent provisioning across deployment runs.
 */
export async function syncStudioConfigToDb(suClient?: PocketBase): Promise<{ success: boolean; recordId: string }> {
  const su = suClient ?? (await getSuperuserClient())
  const col = su.collection('settings')

  let settingsRecord: any = null
  try {
    const list = await col.getList(1, 1)
    if (list.items.length > 0) {
      settingsRecord = list.items[0]
    }
  } catch (err) {
    console.warn('[studio-config] failed to query settings collection:', err)
  }

  const payload: Record<string, unknown> = {
    studio_name: studioConfig.studioName,
    timezone: studioConfig.timezone,
    currency: studioConfig.currency,
    deposit_required: studioConfig.depositRequired,
    deposit_amount: studioConfig.depositAmount,
    payment_instructions: studioConfig.paymentInstructions,
    deposit_application: studioConfig.depositApplication,
    deposit_per_session: studioConfig.depositPerSession,
    cancellation_cutoff_hours: studioConfig.cancellationCutoffHours,
    health_declaration_form_url: studioConfig.healthDeclarationFormUrl ?? '',
    health_declaration_validity_months: studioConfig.healthDeclarationValidityMonths,
    touch_up_policy: studioConfig.touchUpPolicy,
    touch_up_free_days: studioConfig.touchUpFreeDays,
    healing_period_days: studioConfig.healingPeriodDays,
    consultation_followup_days: studioConfig.consultationFollowupDays,
    consultation_lost_after_days: studioConfig.consultationLostAfterDays,
    inquiry_lost_after_days: studioConfig.inquiryLostAfterDays,
    dormant_after_months: studioConfig.dormantAfterMonths,
    post_project_feedback: studioConfig.postProjectFeedback,
    google_review_link: studioConfig.googleReviewLink ?? '',
    easy_review_link: studioConfig.easyReviewLink ?? '',
    ai_enabled: studioConfig.aiEnabled,
    ai_model: studioConfig.aiModel,
    ai_system_instructions: studioConfig.systemInstructions,
    backup_interval_hours: studioConfig.backupIntervalHours,
    backup_retention_count: studioConfig.backupRetentionCount,
    staff_notification_phone: studioConfig.staffNotificationPhone,
  }

  if (settingsRecord) {
    const updated = await col.update(settingsRecord.id, payload)
    await seedInitialFaqIfEmpty(su)
    return { success: true, recordId: updated.id }
  } else {
    payload.onboarding_completed = false
    const created = await col.create(payload)
    await seedInitialFaqIfEmpty(su)
    return { success: true, recordId: created.id }
  }
}

async function seedInitialFaqIfEmpty(su: PocketBase): Promise<void> {
  if (!studioConfig.initialFaq || studioConfig.initialFaq.length === 0) return

  try {
    const faqCol = su.collection('faq')
    const list = await faqCol.getList(1, 1)
    if (list.totalItems === 0) {
      for (const entry of studioConfig.initialFaq) {
        await faqCol.create({
          question: entry.question,
          answer: entry.answer,
        })
      }
      console.log(`[studio-config] Seeded ${studioConfig.initialFaq.length} initial FAQ entries.`)
    }
  } catch (err) {
    // Non-fatal if collection doesn't exist yet
    console.warn('[studio-config] FAQ seeding skipped:', err)
  }
}
