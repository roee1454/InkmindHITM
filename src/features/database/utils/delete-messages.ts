import { createStaleReferenceError } from '@/lib/stale-reference'
import { HEBREW_DAYS_LONG, minutesToTime } from '@/lib/date-utils'
import type { DeletableCollection, DeleteBlocker, DeleteEntityResult, RelationPolicy } from '../types'

/** Hebrew wording for everything the delete flow can say. Pure, so the dialog and server fns share it. */

export const ENTITY_LABELS: Record<DeletableCollection, string> = {
  customers: 'לקוח',
  staff: 'איש צוות',
  appointments: 'תור',
  conversations: 'שיחה',
}

const COLLECTION_LABELS: Record<string, string> = {
  customers: 'לקוחות',
  projects: 'פרויקטים',
  staff: 'אנשי צוות',
  conversations: 'שיחות וואטסאפ',
  messages: 'הודעות בצ׳אט',
  appointments: 'תורים ביומן',
  waitlist_entries: 'רישומים ברשימת ההמתנה',
  credentials: 'חיבור Google Calendar',
  mcp_conversations: 'שיחות עם עוזר ה-AI',
  mcp_messages: 'הודעות בשיחות עם עוזר ה-AI',
  mcp_actions: 'פעולות שהציע עוזר ה-AI',
  audit_log: 'רשומות ביומן הפעילות',
}

export function collectionLabel(collection: string): string {
  return COLLECTION_LABELS[collection] ?? collection
}

export const POLICY_LABELS: Record<RelationPolicy, string> = {
  cascade: 'יימחקו יחד איתו',
  nullify: 'יישארו, רק הקישור יוסר',
  restrict: 'מונעים את המחיקה',
}

export function blockerMessage(blocker: DeleteBlocker): string {
  switch (blocker.code) {
    case 'active_appointments':
      return blocker.appointments.length === 1
        ? 'ללקוח יש תור עתידי פעיל. יש לבטל אותו לפני המחיקה, כך שהלקוח יקבל עדכון והמשבצת תתפנה לרשימת ההמתנה.'
        : `ללקוח יש ${blocker.appointments.length} תורים עתידיים פעילים. יש לבטל אותם לפני המחיקה, כך שהלקוח יקבל עדכון והמשבצות יתפנו לרשימת ההמתנה.`
    case 'last_owner':
      return 'זהו הבעלים היחיד של הסטודיו. יש להגדיר בעלים נוסף לפני המחיקה.'
    case 'self_delete':
      return 'לא ניתן למחוק את המשתמש שלך.'
    case 'restricted_relation':
      return `${blocker.count} ${collectionLabel(blocker.collection)} מונעים את המחיקה.`
  }
}

export const NOT_FOUND_MESSAGE = 'הרשומה כבר לא קיימת. ייתכן שנמחקה ממקום אחר, והרשימה רועננה.'
export const FORBIDDEN_MESSAGE = 'אין לך הרשאה למחוק את הרשומה הזו.'

/**
 * Turns a non-successful delete into an Error for callers that report failures by throwing (the
 * calendar's mutation). A missing record becomes a stale-reference error so the client's global
 * handler also refreshes the lists that still show it.
 */
export function describeDeleteFailure(
  collection: DeletableCollection,
  result: Exclude<DeleteEntityResult, { status: 'deleted' }>,
): Error {
  switch (result.status) {
    case 'not_found':
      return createStaleReferenceError(collection, NOT_FOUND_MESSAGE)
    case 'forbidden':
      return new Error(FORBIDDEN_MESSAGE)
    case 'blocked':
      return new Error(blockerMessage(result.blocker))
    case 'failed':
      return new Error(result.message)
  }
}

/** "יום ג׳ 29.9 · 14:00" — compact enough for a list inside a dialog. */
export function formatAppointmentSlot(startTime: string): string {
  const date = new Date(startTime)
  if (Number.isNaN(date.getTime())) return startTime
  const time = minutesToTime(date.getHours() * 60 + date.getMinutes())
  return `${HEBREW_DAYS_LONG[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1} · ${time}`
}
