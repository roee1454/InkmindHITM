export interface ArtistColor {
  dot: string
  block: string
  /** Border plus background, for calendar appointment blocks */
  surface: string
  /** Initials circle for artist monogram badge */
  monogram: string
}

const SOLID_STYLE: ArtistColor = {
  dot: 'bg-foreground/70',
  block: 'border-border hover:bg-muted/50',
  surface: 'border-border bg-card',
  monogram: 'bg-muted text-foreground ring-border',
}

/**
 * Returns solid, unified neutral styling for artist appointments and badges.
 * Rainbow categorical palette has been replaced with a clean, solid UI aesthetic.
 */
export function artistColor(_staffId: string | null): ArtistColor {
  return SOLID_STYLE
}
