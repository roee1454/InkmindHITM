import { createServerFn } from '@tanstack/react-start'
import { ClientResponseError } from 'pocketbase'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth } from './helpers.server'

/** Studio name/portfolio links commonly get typed as a bare domain or handle ("inkmind.tattoo",
 *  "instagram.com/studio") with no scheme — PocketBase's `url` field type rejects those outright
 *  ("Must be a valid url"), which is exactly what onboarding step 3 was hitting. Prepend `https://`
 *  so a normal-looking link a person would type is accepted instead of silently failing. */
function normalizeUrlField(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

const URL_FIELD_LABELS: Record<string, string> = {
  portfolio_website: 'קישור לתיק עבודות',
  portfolio_instagram: 'אינסטגרם',
  website_url: 'אתר הסטודיו',
}

/** PocketBase's generic "Failed to update/create record." tells the user nothing — surface which
 *  field it actually rejected and why, in Hebrew, instead. */
function describeArtistProfileError(err: unknown): Error {
  if (err instanceof ClientResponseError) {
    const fieldErrors = err.response?.data as Record<string, { message?: string }> | undefined
    if (fieldErrors) {
      const messages = Object.entries(fieldErrors).map(([field, detail]) => {
        const label = URL_FIELD_LABELS[field] ?? field
        return `${label}: ${detail?.message === 'Must be a valid url' ? 'הקישור אינו תקין' : detail?.message || 'ערך לא תקין'}`
      })
      if (messages.length > 0) return new Error(messages.join(' · '))
    }
  }
  return err instanceof Error ? err : new Error('שגיאה בשמירת הפרופיל')
}

export interface ApiArtistProfile {
  id: string
  staffId: string
  portfolioUrl: string | null
  instagramHandle: string | null
  websiteUrl: string | null
  bio: string | null
  artistName: string
}

export const getArtistProfiles = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiArtistProfile[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('artist_profiles').getFullList({ expand: 'staff' })

    return list.map((item) => {
      const staffObj = item.expand?.staff as { name?: string } | undefined
      return {
        id: item.id,
        staffId: (item.staff as string) || '',
        portfolioUrl: (item.portfolio_website as string) || null,
        instagramHandle: (item.portfolio_instagram as string) || null,
        websiteUrl: (item.website_url as string) || null,
        bio: (item.bio as string) || null,
        artistName: staffObj?.name || 'מקעקע/ת',
      }
    })
  },
)

const saveArtistProfileSchema = z.object({
  id: z.string().optional(),
  staffId: z.string(),
  portfolioUrl: z.string().nullable().optional(),
  instagramHandle: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
})

export const saveArtistProfile = createServerFn({ method: 'POST' })
  .validator(saveArtistProfileSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    if (!isAdmin && session.staff.id !== data.staffId) {
      throw new Error('רק מנהלים או בעלי הפרופיל יכולים לערוך פרופיל זה.')
    }

    const su = await getSuperuserClient()
    const payload: Record<string, unknown> = {
      staff: data.staffId,
      portfolio_website: normalizeUrlField(data.portfolioUrl),
      portfolio_instagram: normalizeUrlField(data.instagramHandle),
      website_url: normalizeUrlField(data.websiteUrl),
      bio: data.bio || '',
    }

    try {
      if (data.id) {
        const updated = await su.collection('artist_profiles').update(data.id, payload)
        return { id: updated.id }
      } else {
        const existing = await su.collection('artist_profiles').getList(1, 1, {
          filter: `staff = "${data.staffId}"`,
        })
        const first = existing.items[0]
        if (first) {
          const updated = await su.collection('artist_profiles').update(first.id, payload)
          return { id: updated.id }
        }
        const created = await su.collection('artist_profiles').create(payload)
        return { id: created.id }
      }
    } catch (err) {
      throw describeArtistProfileError(err)
    }
  })

const deleteArtistProfileSchema = z.object({
  id: z.string(),
})

export const deleteArtistProfile = createServerFn({ method: 'POST' })
  .validator(deleteArtistProfileSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    if (session.staff.role !== 'owner' && session.staff.role !== 'admin') {
      throw new Error('רק מנהלים יכולים למחוק פרופיל.')
    }
    const su = await getSuperuserClient()
    await su.collection('artist_profiles').delete(data.id)
    return { ok: true }
  })

export interface BotArtistMatch {
  staffId: string
  name: string
  portfolioUrl: string | null
  instagramHandle: string | null
  websiteUrl: string | null
  bio: string | null
  isAdmin: boolean
}

/** Superuser-context artist lookup for the `suggest_artists` bot tool. A name search (when
 *  given) always takes precedence — a client naming a specific artist is a more specific
 *  request than a general style question. Style matching isn't done server-side any more
 *  (there's no `tattoo_styles` enum): each artist's free-text `bio` is returned instead, and
 *  the model reasons over it directly — it can read "מתמחה בריאליזם ושחור-לבן" as well as any
 *  enum lookup could, without the studio being boxed into 12 fixed style buckets. Name
 *  matching is case-insensitive substring, not exact, matching the ported prototype's
 *  behavior. */
export async function suggestArtistsForBot(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
  { artistName }: { artistName?: string },
): Promise<BotArtistMatch[]> {
  const list = await su.collection('artist_profiles').getFullList({ expand: 'staff' })

  const toMatch = (item: (typeof list)[number]): BotArtistMatch => {
    const staffObj = item.expand?.staff as { name?: string; role?: string } | undefined
    return {
      staffId: (item.staff as string) || '',
      name: staffObj?.name || 'מקעקע/ת',
      portfolioUrl: (item.portfolio_website as string) || null,
      instagramHandle: (item.portfolio_instagram as string) || null,
      websiteUrl: (item.website_url as string) || null,
      bio: (item.bio as string) || null,
      isAdmin: staffObj?.role === 'owner' || staffObj?.role === 'admin',
    }
  }

  if (artistName && artistName.trim()) {
    const wanted = artistName.trim().toLowerCase()
    const matches = list.filter((item) => {
      const name = (item.expand?.staff as { name?: string } | undefined)?.name
      return name?.toLowerCase().includes(wanted)
    }).map(toMatch)
    if (matches.length > 0) return matches
  }

  return list.map(toMatch)
}

export interface WorkingHoursWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

/** Superuser-context working-hours lookup, shared by the `requireAuth()`-gated server fn
 *  below and by webhook-triggered bot tools (which have no staff session to gate on). */
export async function getWorkingHoursForStaff(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
  staffId: string,
): Promise<WorkingHoursWindow[]> {
  const existing = await su.collection('artist_profiles').getList(1, 1, {
    filter: `staff = "${staffId}"`,
  })

  const profile = existing.items[0]
  if (!profile || !Array.isArray(profile.work_hours)) return []

  return profile.work_hours.map((raw: Record<string, unknown>) => {
    const dayRaw = raw.dayOfWeek ?? raw.day_of_week ?? raw.day
    const dayOfWeek = typeof dayRaw === 'number' ? dayRaw : Number(dayRaw)
    const startTime = String(raw.startTime || raw.start_time || '11:00')
    const endTime = String(raw.endTime || raw.end_time || '19:00')
    return {
      dayOfWeek: Number.isNaN(dayOfWeek) ? 0 : dayOfWeek,
      startTime,
      endTime,
    }
  })
}

const getWorkingHoursSchema = z.object({
  staffId: z.string(),
})

export const getWorkingHours = createServerFn({ method: 'GET' })
  .validator(getWorkingHoursSchema)
  .handler(async ({ data }): Promise<WorkingHoursWindow[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    return getWorkingHoursForStaff(su, data.staffId)
  })

const windowItemSchema = z.object({
  dayOfWeek: z.coerce.number(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
})

const saveWorkingHoursSchema = z.object({
  staffId: z.string(),
  windows: z.array(windowItemSchema),
})

export const saveWorkingHours = createServerFn({ method: 'POST' })
  .validator(saveWorkingHoursSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    if (!isAdmin && session.staff.id !== data.staffId) {
      throw new Error('אין הרשאה לעדכן שעות עבודה של מקעקע אחר.')
    }

    const su = await getSuperuserClient()
    const existing = await su.collection('artist_profiles').getList(1, 1, {
      filter: `staff = "${data.staffId}"`,
    })

    const normalizedWindows = data.windows.map((w) => ({
      dayOfWeek: Number(w.dayOfWeek),
      startTime: String(w.startTime || '11:00'),
      endTime: String(w.endTime || '19:00'),
    }))

    const first = existing.items[0]
    if (first) {
      await su.collection('artist_profiles').update(first.id, {
        work_hours: normalizedWindows,
      })
    } else {
      await su.collection('artist_profiles').create({
        staff: data.staffId,
        work_hours: normalizedWindows,
      })
    }
    return normalizedWindows
  })
