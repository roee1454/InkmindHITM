import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { formatDatabaseError } from '@/lib/pocketbase-error'
import { sendStaffInviteEmail } from '@/lib/mailer.server'
import { resolveAppUrl } from '@/lib/server-urls.server'
import { requireAuth, requireAdmin } from './helpers.server'


export interface WorkingHoursWindow {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export function normalizeUrlField(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export interface CurrentStaffInfo {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isAdmin: boolean
}

export const getCurrentStaffInfo = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentStaffInfo> => {
    const session = await requireAuth()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    return {
      id: session.staff.id,
      name: session.staff.name || 'משתמש',
      email: session.staff.email || '',
      phone: session.staff.phone || '',
      role: session.staff.role || 'artist',
      isAdmin,
    }
  },
)

export interface StaffMember {
  id: string
  name: string
  email: string
  phone: string
  role: string
  portfolioUrl: string | null
  bio: string | null
  workHours: WorkingHoursWindow[]
  isAdmin: boolean
  hasPassword: boolean
  avatar?: string
  inviteToken?: string | null
  invitePending: boolean
  inviteAcceptedAt?: string | null
}

export const getStaffList = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StaffMember[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('staff').getFullList({ sort: 'name' })

    return list.map((item) => {
      const role = (item.role as string) || 'artist'
      const email = (item.email as string) || ''
      const inviteToken = (item.invite_token as string) || null
      const inviteAcceptedAt = (item.invite_accepted_at as string) || null
      const invitePending = Boolean(inviteToken && !inviteAcceptedAt)
      const hasPassword = Boolean(
        item.passwordHash ||
        item.password ||
        email ||
        (email && !invitePending) ||
        role === 'owner' ||
        role === 'admin'
      )
      const workHoursRaw = (item.work_hours as Array<Record<string, unknown>>) || []
      const workHours: WorkingHoursWindow[] = Array.isArray(workHoursRaw)
        ? workHoursRaw.map((raw) => ({
            dayOfWeek: Number(raw.dayOfWeek ?? raw.day_of_week ?? raw.day ?? 0),
            startTime: String(raw.startTime || raw.start_time || '10:00'),
            endTime: String(raw.endTime || raw.end_time || '18:00'),
          }))
        : []

      return {
        id: item.id,
        name: (item.name as string) || 'ללא שם',
        email,
        phone: (item.phone as string) || '',
        role,
        portfolioUrl: (item.portfolio_url as string) || null,
        bio: (item.bio as string) || null,
        workHours,
        isAdmin: role === 'owner' || role === 'admin',
        hasPassword,
        avatar: (item.avatar as string) || undefined,
        inviteToken,
        invitePending,
        inviteAcceptedAt,
      }
    })
  },
)

export const windowItemSchema = z.object({
  dayOfWeek: z.coerce.number(),
  startTime: z.string().min(1, 'שעת התחלה נדרשת'),
  endTime: z.string().min(1, 'שעת סיום נדרשת'),
})

export const addStaffSchema = z.object({
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  email: z.string().email('נא להזין אימייל תקין'),
  role: z.enum(['owner', 'admin', 'staff']).default('staff'),
})

export const addStaffMember = createServerFn({ method: 'POST' })
  .validator(addStaffSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()

    const normalizedEmail = data.email.trim().toLowerCase()
    const existing = await su.collection('staff').getList(1, 1, {
      filter: `email = "${normalizedEmail}"`,
    })
    if (existing.totalItems > 0) {
      throw new Error('כתובת אימייל זו כבר קיימת במערכת.')
    }

    const token = crypto.randomBytes(32).toString('hex')
    const placeholderPassword = crypto.randomBytes(24).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const record = await su.collection('staff').create({
      name: data.name.trim(),
      email: normalizedEmail,
      phone: '',
      password: placeholderPassword,
      passwordConfirm: placeholderPassword,
      role: data.role,
      portfolio_url: '',
      bio: '',
      work_hours: [],
      active: true,
      emailVisibility: true,
      invite_token: token,
      invite_token_expires_at: expiresAt,
    })

    const inviteLink = resolveAppUrl(`/invite?token=${token}`)

    try {
      await sendStaffInviteEmail({
        email: normalizedEmail,
        name: data.name.trim(),
        inviteUrl: inviteLink,
      })
    } catch (err) {
      console.warn('[addStaffMember] Notice: Mailer delivery notice:', err)
    }

    return {
      id: record.id,
      name: data.name,
      email: normalizedEmail,
      role: data.role,
      inviteToken: token,
      inviteLink,
    }
  })

export const inviteStaffMember = addStaffMember

export {
  verifyStaffInviteToken,
  acceptStaffInvite,
  acceptStaffInviteSchema,
} from '@/features/invite/server/invite'


export const resendStaffInvite = createServerFn({ method: 'POST' })
  .validator(z.object({ staffId: z.string() }))
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    const staff = await su.collection('staff').getOne(data.staffId)
    if (!staff) throw new Error('איש צוות לא נמצא.')

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await su.collection('staff').update(data.staffId, {
      invite_token: token,
      invite_token_expires_at: expiresAt,
      invite_accepted_at: null,
    })

    const inviteLink = resolveAppUrl(`/invite?token=${token}`)

    try {
      await sendStaffInviteEmail({
        email: staff.email as string,
        name: (staff.name as string) || '',
        inviteUrl: inviteLink,
      })
    } catch (err) {
      console.warn('[resendStaffInvite] Email send notice:', err)
    }

    return {
      inviteToken: token,
      inviteLink,
    }
  })

export const updateStaffSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים').optional(),
  email: z.string().email('נא להזין אימייל תקין').optional(),
  phone: z.string().trim().min(9, 'מספר טלפון חייב להכיל לפחות 9 ספרות').optional(),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
  portfolioUrl: z.string().trim().min(3, 'קישור לתיק עבודות או אינסטגרם').optional(),
  bio: z.string().optional(),
  workHours: z.array(windowItemSchema).min(1, 'חובה להגדיר לפחות יום עבודה אחד פעיל').optional(),
})

export const updateStaffMember = createServerFn({ method: 'POST' })
  .validator(updateStaffSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    if (!isAdmin && session.staff.id !== data.id) {
      throw new Error('אין הרשאה לעדכן פרטי איש צוות אחר.')
    }

    const su = await getSuperuserClient()
    const payload: Record<string, unknown> = {}

    if (data.name !== undefined) payload.name = data.name
    if (data.email !== undefined) payload.email = data.email
    if (data.phone !== undefined) payload.phone = data.phone
    if (data.portfolioUrl !== undefined) payload.portfolio_url = normalizeUrlField(data.portfolioUrl)
    if (data.bio !== undefined) payload.bio = data.bio.trim()
    if (data.workHours !== undefined) {
      payload.work_hours = data.workHours.map((w) => ({
        dayOfWeek: Number(w.dayOfWeek),
        startTime: String(w.startTime || '10:00'),
        endTime: String(w.endTime || '18:00'),
      }))
    }
    if (isAdmin && data.role !== undefined) {
      payload.role = data.role
    }

    try {
      await su.collection('staff').update(data.id, payload)
      return { ok: true }
    } catch (err) {
      throw new Error(formatDatabaseError(err, 'עדכון פרטי איש הצוות נכשל.'))
    }
  })

const setPasswordSchema = z.object({
  staffId: z.string(),
  password: z.string().min(8, 'סיסמה חייבת להכיל לפחות 8 תווים'),
})

export const setStaffPassword = createServerFn({ method: 'POST' })
  .validator(setPasswordSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    await su.collection('staff').update(data.staffId, {
      password: data.password,
      passwordConfirm: data.password,
    })
    return { ok: true }
  })

// ---------------------------------------------------------------------------
// Working hours direct operations on staff
// ---------------------------------------------------------------------------

export async function getWorkingHoursForStaff(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
  staffId: string,
): Promise<WorkingHoursWindow[]> {
  try {
    const staff = await su.collection('staff').getOne(staffId)
    if (!staff || !Array.isArray(staff.work_hours)) return []

    return staff.work_hours.map((raw: Record<string, unknown>) => {
      const dayRaw = raw.dayOfWeek ?? raw.day_of_week ?? raw.day
      const dayOfWeek = typeof dayRaw === 'number' ? dayRaw : Number(dayRaw)
      const startTime = String(raw.startTime || raw.start_time || '10:00')
      const endTime = String(raw.endTime || raw.end_time || '18:00')
      return {
        dayOfWeek: Number.isNaN(dayOfWeek) ? 0 : dayOfWeek,
        startTime,
        endTime,
      }
    })
  } catch {
    return []
  }
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

const saveWorkingHoursSchema = z.object({
  staffId: z.string(),
  windows: z.array(windowItemSchema).min(1, 'חובה להגדיר לפחות יום עבודה אחד פעיל'),
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
    const normalizedWindows = data.windows.map((w) => ({
      dayOfWeek: Number(w.dayOfWeek),
      startTime: String(w.startTime || '10:00'),
      endTime: String(w.endTime || '18:00'),
    }))

    await su.collection('staff').update(data.staffId, {
      work_hours: normalizedWindows,
    })
    return normalizedWindows
  })

// ---------------------------------------------------------------------------
// Bot artist suggestions (direct from staff collection)
// ---------------------------------------------------------------------------

export interface BotArtistMatch {
  staffId: string
  name: string
  portfolioUrl: string | null
  bio: string | null
  isAdmin: boolean
  workingHours?: WorkingHoursWindow[]
}

export async function suggestArtistsForBot(
  su: Awaited<ReturnType<typeof getSuperuserClient>>,
  { artistName }: { artistName?: string },
): Promise<BotArtistMatch[]> {
  const list = await su.collection('staff').getFullList({
    filter: 'active = true',
    sort: 'name',
  })

  const validStaff = list.filter((item) => {
    const name = (item.name as string) || ''
    return name.trim().length > 0
  })

  const toMatch = (item: (typeof validStaff)[number]): BotArtistMatch => {
    const workHoursRaw = (item.work_hours as Array<Record<string, unknown>>) || []
    const parsedHours: WorkingHoursWindow[] = Array.isArray(workHoursRaw)
      ? workHoursRaw.map((raw) => ({
          dayOfWeek: Number(raw.dayOfWeek ?? raw.day_of_week ?? raw.day ?? 0),
          startTime: String(raw.startTime || raw.start_time || '10:00'),
          endTime: String(raw.endTime || raw.end_time || '18:00'),
        }))
      : []

    return {
      staffId: item.id,
      name: ((item.name as string) || '').trim(),
      portfolioUrl: (item.portfolio_url as string) || null,
      bio: (item.bio as string) || null,
      isAdmin: item.role === 'owner' || item.role === 'admin',
      workingHours: parsedHours,
    }
  }

  if (artistName && artistName.trim()) {
    const wanted = artistName.trim().toLowerCase()
    const matches = validStaff
      .filter((item) => ((item.name as string) || '').toLowerCase().includes(wanted))
      .map(toMatch)
    if (matches.length > 0) return matches
  }

  return validStaff.map(toMatch)
}

// ---------------------------------------------------------------------------
// Backward-compatible Artist Profile helpers (now mapped to staff)
// ---------------------------------------------------------------------------

export interface ApiArtistProfile {
  id: string
  staffId: string
  portfolioUrl: string | null
  bio: string | null
  artistName: string
}

export const getArtistProfiles = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ApiArtistProfile[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('staff').getFullList({
      filter: 'active = true',
      sort: 'name',
    })

    return list.map((item) => ({
      id: item.id,
      staffId: item.id,
      portfolioUrl: (item.portfolio_url as string) || null,
      bio: (item.bio as string) || null,
      artistName: (item.name as string) || 'מקעקע/ת',
    }))
  },
)

const saveArtistProfileSchema = z.object({
  id: z.string().optional(),
  staffId: z.string(),
  portfolioUrl: z.string().nullable().optional(),
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
      portfolio_url: normalizeUrlField(data.portfolioUrl),
      bio: (data.bio || '').trim(),
    }

    await su.collection('staff').update(data.staffId, payload)
    return { id: data.staffId }
  })

const deleteArtistProfileSchema = z.object({
  id: z.string(),
})

export const deleteArtistProfile = createServerFn({ method: 'POST' })
  .validator(deleteArtistProfileSchema)
  .handler(async ({ data }) => {
    const session = await requireAuth()
    const isAdmin = session.staff.role === 'owner' || session.staff.role === 'admin'
    if (!isAdmin && session.staff.id !== data.id) {
      throw new Error('רק מנהלים או בעל הפרופיל יכולים למחוק פרופיל זה.')
    }
    const su = await getSuperuserClient()
    await su.collection('staff').update(data.id, {
      portfolio_url: '',
      bio: '',
    })
    return { ok: true }
  })

