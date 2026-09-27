import { cn } from '@/lib/utils'
import { artistColor } from '../utils/artist-colors'

/**
 * Two letters of the *first* name, not first-plus-last initials: a studio is often a family, and
 * "איתי חיילי" / "דור חיילי" / "רואי חיילי" all collapse to the same second letter. A calendar
 * block has no room for more, and the ring colour is already narrowing it down.
 */
export function artistInitials(name: string | null): string {
  const first = (name || '').trim().split(/\s+/).filter(Boolean)[0]
  return first ? first.slice(0, 2) : '—'
}

interface ArtistBadgeProps {
  staffId: string | null
  staffName: string | null
  avatarUrl?: string | null
  /** px — 14 on a calendar block, 16+ where there's room. */
  size?: number
  className?: string
}

/**
 * Who the appointment belongs to, said explicitly (track-b B6.8): the artist's Google avatar when
 * they've connected one, their initials in the artist's own colour otherwise. The block's tint
 * already groups by artist, but a colour alone asks staff to memorise a legend — this names them.
 */
export function ArtistBadge({ staffId, staffName, avatarUrl, size = 14, className }: ArtistBadgeProps) {
  const artist = artistColor(staffId)
  const title = staffName ? `מקעקע: ${staffName}` : 'ללא שיוך מקעקע'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={title}
        title={title}
        style={{ width: size, height: size }}
        className={cn('shrink-0 rounded-full object-cover ring-1 ring-border', className)}
      />
    )
  }

  return (
    <span
      title={title}
      aria-label={title}
      style={{ width: size, height: size, fontSize: Math.max(7, Math.round(size * 0.5)) }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-extrabold leading-none text-foreground ring-1',
        artist.monogram,
        className,
      )}
    >
      {artistInitials(staffName)}
    </span>
  )
}
