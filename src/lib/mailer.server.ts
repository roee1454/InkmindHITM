import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'

export interface StaffInviteEmailPayload {
  email: string
  name: string
  inviteUrl: string
}

export async function sendStaffInviteEmail(payload: StaffInviteEmailPayload): Promise<boolean> {
  try {
    const su = await getSuperuserClient()
    await su.send('/api/inkmind/send-invite-email', {
      method: 'POST',
      body: {
        to: payload.email,
        name: payload.name,
        inviteUrl: payload.inviteUrl,
      },
    })
    return true
  } catch (err) {
    console.warn('[sendStaffInviteEmail] PocketBase mailer delivery notice:', err)
    return false
  }
}

