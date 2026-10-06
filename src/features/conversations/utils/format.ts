/** Short time (HH:MM) for message bubbles. */
export function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
}

/** Relative-ish label for the conversation list (today → time, else date). */
export function formatListTimestamp(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  return sameDay
    ? d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
}

/** `3 שעות` / `שעה וחצי` / `45 דק׳` — the HITL quote block's duration box. */
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '—'
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (hours === 0) {
    if (rem === 30) return 'חצי שעה'
    return `${rem} דק׳`
  }
  if (rem === 0) {
    if (hours === 1) return 'שעה'
    if (hours === 2) return 'שעתיים'
    return `${hours} שעות`
  }
  if (rem === 30) {
    if (hours === 1) return 'שעה וחצי'
    return `${hours} שעות וחצי`
  }
  if (hours === 1) return `שעה ו-${rem} דק׳`
  return `${hours} שעות ו-${rem} דק׳`
}

export type WindowStatus = 'open' | 'closing-soon' | 'expired'

export interface WindowRemaining {
  label: string
  shortLabel: string
  status: WindowStatus
}

/** WhatsApp's 24h free-messaging window. `expiresAt` is `conversations.whatsapp_window_expires_at`,
 *  refreshed on every inbound customer message. */
export function formatWindowRemaining(expiresAt: string | null): WindowRemaining {
  if (!expiresAt) return { label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' }
  const expires = new Date(expiresAt)
  if (Number.isNaN(expires.getTime())) return { label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' }

  const diffMs = expires.getTime() - Date.now()
  if (diffMs <= 0) return { label: 'חלון 24 השעות פג', shortLabel: 'חלון פג', status: 'expired' }

  const diffHours = diffMs / (60 * 60 * 1000)
  const status: WindowStatus = diffHours >= 12 ? 'open' : 'closing-soon'
  if (diffHours < 1) {
    const minutes = Math.max(1, Math.round(diffMs / (60 * 1000)))
    return { label: `${minutes} דקות נותרו לחלון`, shortLabel: `${minutes} דק'`, status }
  }
  const hours = Math.round(diffHours)
  return { label: `${hours} שעות נותרו לחלון`, shortLabel: `${hours} שע'`, status }
}

/** `₪1,600–2,000` — collapses to a single figure when min and max match. Returns 'ייקבע בפגישה' when unset or 0. */
export function formatPriceRange(min: number | null, max: number | null): string {
  if ((min == null || min === 0) && (max == null || max === 0)) return 'ייקבע בפגישה'
  if (min == null || max == null || min === max) {
    const val = max ?? min ?? 0
    if (val === 0) return 'ייקבע בפגישה'
    return `₪${val.toLocaleString()}`
  }
  return `₪${min.toLocaleString()}–${max.toLocaleString()}`
}

/** YYYY-MM-DD key in local timezone for grouping messages by day. */
export function getDateKey(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** WhatsApp-style Hebrew date separator label for chat threads. */
export function formatMessageDateSeparator(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000))

  if (diffDays === 0) {
    return 'היום'
  }
  if (diffDays === 1) {
    return 'אתמול'
  }

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
