import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSessionClient, persistSessionCookie } from '@/lib/session.server'
import { acceptStaffInviteSchema } from '../types'
import type { VerifyStaffInviteResult } from '../types'

export { acceptStaffInviteSchema } from '../types'

export const verifyStaffInviteToken = createServerFn({ method: 'GET' })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data }): Promise<VerifyStaffInviteResult> => {
    const su = await getSuperuserClient()
    const records = await su.collection('staff').getList(1, 1, {
      filter: `invite_token = "${data.token}"`,
    })
    if (records.totalItems === 0) {
      return { valid: false as const, reason: 'not_found' as const }
    }
    const staff = records.items[0]
    if (!staff) {
      return { valid: false as const, reason: 'not_found' as const }
    }
    if (staff.invite_accepted_at) {
      return { valid: false as const, reason: 'already_accepted' as const }
    }
    if (staff.invite_token_expires_at && new Date(staff.invite_token_expires_at).getTime() < Date.now()) {
      return { valid: false as const, reason: 'expired' as const }
    }
    return {
      valid: true as const,
      staff: {
        id: staff.id,
        name: (staff.name as string) || '',
        email: (staff.email as string) || '',
        role: (staff.role as string) || 'staff',
      },
    }
  })

export const acceptStaffInvite = createServerFn({ method: 'POST' })
  .validator(acceptStaffInviteSchema)
  .handler(async ({ data }) => {
    const su = await getSuperuserClient()
    const records = await su.collection('staff').getList(1, 1, {
      filter: `invite_token = "${data.token}"`,
    })
    const staff = records.items[0]
    if (!staff || records.totalItems === 0) {
      throw new Error('הזמנה לא נמצאה או שאינה תקינה.')
    }
    if (staff.invite_accepted_at) {
      throw new Error('הזמנה זו כבר מומשה בעבר. נא להתחבר עם הסיסמה שנקבעה.')
    }
    if (staff.invite_token_expires_at && new Date(staff.invite_token_expires_at).getTime() < Date.now()) {
      throw new Error('פג תוקף ההזמנה. אנא פנה למנהל הסטודיו לקבלת קישור חדש.')
    }

    await su.collection('staff').update(staff.id, {
      password: data.password,
      passwordConfirm: data.password,
      phone: data.phone.trim(),
      invite_accepted_at: new Date().toISOString(),
      invite_token: '',
    })

    const client = getSessionClient()
    await client.collection('staff').authWithPassword(staff.email as string, data.password)
    persistSessionCookie(client)

    return { ok: true, staffId: staff.id }
  })

