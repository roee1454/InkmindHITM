import type { ConversationState } from '../prompts'
import type { DepositPerSession, TouchUpRule } from '@/lib/project-policy'

/**
 * What a booking the bot starts is for: a new piece of work (a new project), the next session of
 * the piece under way, or a touch-up of a finished one. The next session and the touch-up join the
 * existing project, so the funnel, the money and the artist's estimate stay on one piece of work.
 */
export const BOOKING_SCOPES = ['new_project', 'next_session', 'touch_up'] as const
export type BookingScope = (typeof BOOKING_SCOPES)[number]

/** A customer between sessions who asks to book means the next session, unless they say otherwise. */
export function defaultBookingScope(state: ConversationState): BookingScope {
  return state === 'PROJECT_IN_PROGRESS' ? 'next_session' : 'new_project'
}

/** How a touch-up is handled: the studio's policy, and whether it's still within the free period. */
export type TouchUpTerms = 'ask_staff' | 'free' | 'charged'

const DAY_MS = 24 * 60 * 60 * 1000

export function touchUpTerms(rule: TouchUpRule, finishedAt: string | null, now: Date): TouchUpTerms {
  if (rule.kind === 'undecided') return 'ask_staff'
  if (rule.kind === 'charged') return 'charged'
  if (!finishedAt) return 'free'
  return now.getTime() - new Date(finishedAt).getTime() <= rule.days * DAY_MS ? 'free' : 'charged'
}

/**
 * What staff need to know about a follow-up hold the bot created: it continues a piece they already
 * priced, and whether the studio's policy asks a deposit or a charge for it.
 */
export function followUpStaffNote(
  scope: BookingScope | undefined,
  terms: TouchUpTerms | undefined,
  depositPerSession: DepositPerSession,
): { title: string; detail: string } | null {
  if (scope === 'next_session') {
    return {
      title: 'בקשת סשן המשך — ממתינה לאישור',
      detail:
        depositPerSession === 'not_required'
          ? 'סשן המשך באותו פרויקט. לפי מדיניות הסטודיו לא נדרשת מקדמה לסשן המשך: אפשר לאשר את התור ישירות.'
          : 'סשן המשך באותו פרויקט. הזן מקדמה ואשר בכרטיס שבראש השיחה.',
    }
  }
  if (scope === 'touch_up') {
    return {
      title: "בקשת טאץ'-אפ — ממתינה לאישור",
      detail:
        terms === 'free'
          ? "טאץ'-אפ בתקופה שבה הוא ללא עלות לפי המדיניות: אפשר לאשר את התור ישירות, ולסגור אותו ללא חיוב."
          : "טאץ'-אפ בתשלום לפי המדיניות. הזן מחיר ומקדמה בכרטיס שבראש השיחה.",
    }
  }
  return null
}
