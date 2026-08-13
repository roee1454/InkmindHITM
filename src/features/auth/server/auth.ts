import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { createRequestClient, getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { clearSessionCookie, getSession, getSessionClient, persistSessionCookie } from '@/lib/session.server'

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getSession()
  if (!session) return null
  const client = getSessionClient()
  return {
    staff: session.staff,
    token: client.authStore.token,
  }
})

/** True until the very first staff (owner) account is created. */
export const needsBootstrap = createServerFn({ method: 'GET' }).handler(async () => {
  const su = await getSuperuserClient()
  const result = await su.collection('staff').getList(1, 1)
  return result.totalItems === 0
})

const bootstrapSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

/** Creates the first `staff` record (role: owner) and logs the caller in immediately. */
export const bootstrapAdmin = createServerFn({ method: 'POST' })
  .validator(bootstrapSchema)
  .handler(async ({ data }) => {
    const su = await getSuperuserClient()
    const existing = await su.collection('staff').getList(1, 1)
    if (existing.totalItems > 0) {
      throw new Error('כבר קיים חשבון מנהל.')
    }
    await su.collection('staff').create({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.password,
      role: 'owner',
      active: true,
      emailVisibility: true,
    })
    const client = getSessionClient()
    await client.collection('staff').authWithPassword(data.email, data.password)
    persistSessionCookie(client)
  })

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const login = createServerFn({ method: 'POST' })
  .validator(loginSchema)
  .handler(async ({ data }) => {
    const client = getSessionClient()
    try {
      await client.collection('staff').authWithPassword(data.email, data.password)
    } catch {
      throw new Error('אימייל או סיסמה שגויים.')
    }
    persistSessionCookie(client)
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const client = getSessionClient()
  clearSessionCookie(client)
})

const requestResetSchema = z.object({
  email: z.string().email(),
})

/** Always resolves successfully regardless of whether `email` matches a staff record — the UI
 *  shows the same "check your inbox" message either way, so this can't be used to enumerate
 *  which emails have accounts. */
export const requestStaffPasswordReset = createServerFn({ method: 'POST' })
  .validator(requestResetSchema)
  .handler(async ({ data }) => {
    const client = createRequestClient(null)
    try {
      await client.collection('staff').requestPasswordReset(data.email)
    } catch {
      // Swallow — including "no such record" — so the response never reveals account existence.
    }
  })

const confirmResetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'הסיסמה חייבת להכיל לפחות 8 תווים'),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'הסיסמאות אינן תואמות',
    path: ['passwordConfirm'],
  })

export const confirmStaffPasswordReset = createServerFn({ method: 'POST' })
  .validator(confirmResetSchema)
  .handler(async ({ data }) => {
    const client = createRequestClient(null)
    try {
      await client.collection('staff').confirmPasswordReset(data.token, data.password, data.passwordConfirm)
    } catch {
      throw new Error('הקישור פג תוקף או שאינו תקין. יש לבקש איפוס סיסמה חדש.')
    }
  })
