import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'
import { STUDIO_TIMEZONE } from '@/lib/timezone'

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

export const completeOnboarding = createServerFn({ method: 'POST' }).handler(async () => {
  await requireSession()
  const su = await getSuperuserClient()
  const existing = await su.collection('settings').getList(1, 1)
  const record = existing.items[0]
  if (!record) throw new Error('Settings record missing — call ensureSettings first.')
  await su.collection('settings').update(record.id, { onboarding_completed: true })
})

export const updateStudioSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      studio_name: z.string().optional(),
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

// ---------------------------------------------------------------------------
// Artist profiles
// ---------------------------------------------------------------------------

const workHoursSchema = z.array(
  z.object({
    day_of_week: z.number().min(0).max(6),
    start_time: z.string(),
    end_time: z.string(),
  }),
)

const artistProfileSchema = z.object({
  staffId: z.string(),
  portfolio_website: z.string().optional().default(''),
  portfolio_instagram: z.string().optional().default(''),
  portfolio_facebook: z.string().optional().default(''),
  tattoo_styles: z.array(z.string()).default([]),
  bio: z.string().optional().default(''),
  work_hours: workHoursSchema.default([]),
})

export const getArtistProfile = createServerFn({ method: 'GET' })
  .validator(z.object({ staffId: z.string() }))
  .handler(async ({ data }) => {
    await requireSession()
    const su = await getSuperuserClient()
    const result = await su.collection('artist_profiles').getList(1, 1, {
      filter: `staff = "${data.staffId}"`,
    })
    return result.items[0] ?? null
  })

export const saveArtistProfile = createServerFn({ method: 'POST' })
  .validator(artistProfileSchema)
  .handler(async ({ data }) => {
    const session = await requireSession()
    if (data.staffId !== session.staff.id && session.staff.role === 'staff') {
      throw new Error('אתם יכולים לערוך רק את הפרופיל האמנותי שלכם.')
    }
    const su = await getSuperuserClient()
    const existing = await su.collection('artist_profiles').getList(1, 1, {
      filter: `staff = "${data.staffId}"`,
    })
    const payload = {
      staff: data.staffId,
      portfolio_website: data.portfolio_website,
      portfolio_instagram: data.portfolio_instagram,
      portfolio_facebook: data.portfolio_facebook,
      tattoo_styles: data.tattoo_styles,
      bio: data.bio,
      work_hours: data.work_hours,
    }
    if (existing.items[0]) {
      return su.collection('artist_profiles').update(existing.items[0].id, payload)
    }
    return su.collection('artist_profiles').create(payload)
  })

// ---------------------------------------------------------------------------
// Staff management
// ---------------------------------------------------------------------------
// Staff listing/creation/deletion is shared with dashboard Settings — see
// features/settings/server/staff.ts (getStaffList, addStaffMember, deleteStaffMember), the
// single source of truth so onboarding and dashboard screens never diverge.
