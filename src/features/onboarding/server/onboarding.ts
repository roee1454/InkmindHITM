import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import { STUDIO_TIMEZONE } from '@/lib/timezone'
import { getWorkingHoursForStaff } from '@/features/settings/server/profiles'

async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

// ---------------------------------------------------------------------------
// Settings singleton
// ---------------------------------------------------------------------------

export const ensureSettings = createServerFn({ method: 'POST' }).handler(async () => {
  const su = await getSuperuserClient()
  const existing = await su.collection('settings').getList(1, 1)
  if (existing.totalItems > 0) return existing.items[0]
  return su.collection('settings').create({
    studio_name: 'My Studio',
    // Mirror of the code-level constant (src/lib/timezone.ts) — display-only today,
    // but must never drift from the timezone the process actually runs in.
    timezone: STUDIO_TIMEZONE,
    currency: 'USD',
    onboarding_completed: false,
  })
})

export const getSettings = createServerFn({ method: 'GET' }).handler(async () => {
  const su = await getSuperuserClient()
  const existing = await su.collection('settings').getList(1, 1)
  return existing.items[0] ?? null
})

/** The 3 required onboarding steps must actually be filled before onboarding can complete —
 *  previously this was a no-op that let a user hit any onboarding URL and click finish. */
export const completeOnboarding = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await requireSession()
  const su = await getSuperuserClient()
  const existing = await su.collection('settings').getList(1, 1)
  const record = existing.items[0]
  if (!record) throw new Error('Settings record missing — call ensureSettings first.')
  if (!record.studio_name || !String(record.studio_name).trim()) {
    throw new Error('נא להזין שם סטודיו לפני סיום ההגדרה.')
  }
  const hours = await getWorkingHoursForStaff(su, session.staff.id)
  if (hours.length === 0) {
    throw new Error('נא להגדיר לפחות יום עבודה אחד לפני סיום ההגדרה.')
  }
  await su.collection('settings').update(record.id, { onboarding_completed: true })
})

export const updateStudioSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      studio_name: z.string().optional(),
      ui_theme: z
        .enum([
          'indigo',
          'nordic',
          'obsidian',
          'terracotta',
          'noir',
          'amethyst',
          'gold',
          'crimson',
          'teal',
          'rose',
          'olive',
          'steel',
        ])
        .optional(),
      ui_dark_mode: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const existing = await su.collection('settings').getList(1, 1)
    let record = existing.items[0]
    if (!record) {
      record = await su.collection('settings').create({
        studio_name: data.studio_name || 'My Studio',
        timezone: STUDIO_TIMEZONE,
        currency: 'USD',
        onboarding_completed: false,
      })
    }
    return su.collection('settings').update(record!.id, data)
  })

const uploadLogoSchema = z.object({
  base64: z.string(),
  filename: z.string(),
  mimeType: z.string(),
})

/** Persists the studio logo to the `settings.logo` file field — previously this only ever
 *  wrote to `localStorage`, so it never survived a different device or a cleared cache. */
export const uploadStudioLogo = createServerFn({ method: 'POST' })
  .validator(uploadLogoSchema)
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const existing = await su.collection('settings').getList(1, 1)
    const record = existing.items[0]
    if (!record) throw new Error('Settings record missing — call ensureSettings first.')

    const binary = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
    const file = new File([binary], data.filename, { type: data.mimeType })
    const formData = new FormData()
    formData.append('logo', file)
    const updated = await su.collection('settings').update(record.id, formData)
    return { logoFilename: updated.logo as string }
  })

// ---------------------------------------------------------------------------
// Setup checklist — non-blocking "השלמת הגדרה" list surfaced on the dashboard.
// ---------------------------------------------------------------------------

export type ChecklistItemId =
  | 'whatsapp'
  | 'google_calendar'
  | 'deposit_method'
  | 'team'
  | 'closures'
  | 'links_bio'
  | 'faq'

export interface ChecklistItemState {
  dismissed: boolean
}

export interface SetupChecklistRecord {
  items: Partial<Record<ChecklistItemId, ChecklistItemState>>
  /** "אל תציג שוב" on the dashboard card — dismisses the whole card permanently, not a single
   *  item. */
  cardDismissed: boolean
}

function emptyChecklist(): SetupChecklistRecord {
  return { items: {}, cardDismissed: false }
}

export const getSetupChecklistState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<SetupChecklistRecord> => {
    await requireSession()
    const su = await getSuperuserClient()
    const existing = await su.collection('settings').getList(1, 1)
    const raw = existing.items[0]?.setup_checklist
    if (!raw || typeof raw !== 'object') return emptyChecklist()
    return { items: raw.items ?? {}, cardDismissed: Boolean(raw.cardDismissed) }
  },
)

const dismissChecklistItemSchema = z.object({
  itemId: z.string(),
})

export const dismissChecklistItem = createServerFn({ method: 'POST' })
  .validator(dismissChecklistItemSchema)
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const existing = await su.collection('settings').getList(1, 1)
    const record = existing.items[0]
    if (!record) throw new Error('Settings record missing — call ensureSettings first.')
    const current: SetupChecklistRecord =
      record.setup_checklist && typeof record.setup_checklist === 'object'
        ? { items: record.setup_checklist.items ?? {}, cardDismissed: Boolean(record.setup_checklist.cardDismissed) }
        : emptyChecklist()
    current.items[data.itemId as ChecklistItemId] = { dismissed: true }
    await su.collection('settings').update(record.id, { setup_checklist: current })
    return { ok: true }
  })

/** "אל תציג שוב" — permanently dismisses the whole checklist card on the dashboard. */
export const dismissChecklistCard = createServerFn({ method: 'POST' }).handler(async () => {
  await requireSession()
  const su = await getSuperuserClient()
  const existing = await su.collection('settings').getList(1, 1)
  const record = existing.items[0]
  if (!record) throw new Error('Settings record missing — call ensureSettings first.')
  const current: SetupChecklistRecord =
    record.setup_checklist && typeof record.setup_checklist === 'object'
      ? { items: record.setup_checklist.items ?? {}, cardDismissed: false }
      : emptyChecklist()
  current.cardDismissed = true
  await su.collection('settings').update(record.id, { setup_checklist: current })
  return { ok: true }
})

// ---------------------------------------------------------------------------
// Staff management
// ---------------------------------------------------------------------------
// Staff listing/creation/deletion is shared with dashboard Settings — see
// features/settings/server/staff.ts (getStaffList, addStaffMember, deleteStaffMember), the
// single source of truth so onboarding and dashboard screens never diverge.
//
// Artist profile read/write also lives in one place now — features/settings/server/profiles.ts
// (getArtistProfiles/saveArtistProfile) — the onboarding-local duplicate that used to live here
// was deleted; onboarding's profile-links step calls the settings version directly.
