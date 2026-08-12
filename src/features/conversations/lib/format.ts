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

/** `3 שעות` / `שעה וחצי` — the HITL quote block's duration box. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  if (rem === 0) {
    if (hours === 1) return 'שעה'
    if (hours === 2) return 'שעתיים'
    return `${hours} שעות`
  }
  if (rem === 30) {
    if (hours === 0) return 'חצי שעה'
    if (hours === 1) return 'שעה וחצי'
    return `${hours} שעות וחצי`
  }
  return `${Math.round((minutes / 60) * 10) / 10} שעות`
}

/** `₪1,600–2,000` — collapses to a single figure when min and max match. */
export function formatPriceRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—'
  if (min == null || max == null || min === max) return `₪${(max ?? min ?? 0).toLocaleString()}`
  return `₪${min.toLocaleString()}–${max.toLocaleString()}`
}
