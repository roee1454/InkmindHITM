import { getSuperuserClient } from '@/integrations/pocketbase/superuser.server'
import { getSession } from '@/lib/session.server'

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new Error('לא מחובר.')
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.staff.role !== 'owner' && session.staff.role !== 'admin') {
    throw new Error('רק בעלים/מנהלים יכולים לבצע פעולה זו.')
  }
  return session
}

export async function getSettingsRecord() {
  const su = await getSuperuserClient()
  const list = await su.collection('settings').getList(1, 1)
  return { su, record: list.items[0] ?? null }
}
