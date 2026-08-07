import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { requireAuth, requireAdmin } from './helpers.server'

export interface CurrentStaffInfo {
  id: string
  name: string
  email: string
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
      role: session.staff.role || 'artist',
      isAdmin,
    }
  },
)

export interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  isAdmin: boolean
  hasPassword: boolean
  avatar?: string
}

export const getStaffList = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StaffMember[]> => {
    await requireAuth()
    const su = await getSuperuserClient()
    const list = await su.collection('staff').getFullList({ sort: 'name' })

    return list.map((item) => {
      const role = (item.role as string) || 'artist'
      const email = (item.email as string) || ''
      // PocketBase strips raw passwordHash in JSON serialization by default.
      // A staff member has a password if passwordHash is present, or if they have an email/account,
      // or if their role is owner/admin (the primary accounts logging into PB).
      const hasPassword = Boolean(
        item.passwordHash ||
        item.password ||
        email ||
        role === 'owner' ||
        role === 'admin'
      )
      return {
        id: item.id,
        name: (item.name as string) || 'ללא שם',
        email,
        role,
        isAdmin: role === 'owner' || role === 'admin',
        hasPassword,
        avatar: (item.avatar as string) || undefined,
      }
    })
  },
)

const addStaffSchema = z.object({
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  email: z.string().email('נא להזין אימייל תקין'),
  password: z.string().min(8, 'לפחות 8 תווים'),
  role: z.enum(['admin', 'staff']),
})

/** The single canonical "add staff" flow — creates a full login-ready account (name+email+
 *  password+role) in one step, used by both dashboard Settings and onboarding's team step.
 *  Supersedes the old name-only createStaffMember (which left the account passwordless until
 *  a separate "set password" step) — one flow instead of two divergent ones. */
export const addStaffMember = createServerFn({ method: 'POST' })
  .validator(addStaffSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    return su.collection('staff').create({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      role: data.role,
      active: true,
      emailVisibility: true,
    })
  })

const updateStaffSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2, 'השם חייב להכיל לפחות 2 תווים'),
  email: z.string().email('נא להזין אימייל תקין'),
  role: z.enum(['owner', 'admin', 'staff']),
})

export const updateStaffMember = createServerFn({ method: 'POST' })
  .validator(updateStaffSchema)
  .handler(async ({ data }) => {
    await requireAdmin()
    const su = await getSuperuserClient()
    await su.collection('staff').update(data.id, {
      name: data.name,
      email: data.email,
      role: data.role,
    })
    return { ok: true }
  })

const deleteStaffSchema = z.object({
  id: z.string(),
})

export const deleteStaffMember = createServerFn({ method: 'POST' })
  .validator(deleteStaffSchema)
  .handler(async ({ data }) => {
    const session = await requireAdmin()
    if (session.staff.id === data.id) {
      throw new Error('אינך יכול למחוק את עצמך.')
    }
    const su = await getSuperuserClient()
    await su.collection('staff').delete(data.id)
    return { ok: true }
  })

const setPasswordSchema = z.object({
  staffId: z.string(),
  password: z.string().min(6, 'סיסמה חייבת להכיל לפחות 6 תווים'),
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
