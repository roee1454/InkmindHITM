export interface ArtistColor {
  dot: string
  block: string
  /** Border plus a low tint, so a calendar block reads as "whose appointment is this" at a glance. */
  surface: string
  /**
   * The initials circle shown when an artist has no Google avatar. Tinted rather than filled, so
   * the letter stays readable in both themes while the ring still names the artist by colour.
   */
  monogram: string
}

/**
 * The one legitimately categorical palette in the app: it identifies *people*, so it must
 * never collapse into the four status roles. Drawn from the theme's `--brand-artist-*` ramp,
 * which is tuned to stay legible and evenly weighted on both the paper and the dark ground.
 */
const PALETTE: ArtistColor[] = [
  { dot: 'bg-artist-1', block: 'border-artist-1/70 hover:bg-muted/50', surface: 'border-artist-1/45 bg-artist-1/[0.08]', monogram: 'bg-artist-1/20 ring-artist-1/50' },
  { dot: 'bg-artist-2', block: 'border-artist-2/70 hover:bg-muted/50', surface: 'border-artist-2/45 bg-artist-2/[0.08]', monogram: 'bg-artist-2/20 ring-artist-2/50' },
  { dot: 'bg-artist-3', block: 'border-artist-3/70 hover:bg-muted/50', surface: 'border-artist-3/45 bg-artist-3/[0.08]', monogram: 'bg-artist-3/20 ring-artist-3/50' },
  { dot: 'bg-artist-4', block: 'border-artist-4/70 hover:bg-muted/50', surface: 'border-artist-4/45 bg-artist-4/[0.08]', monogram: 'bg-artist-4/20 ring-artist-4/50' },
  { dot: 'bg-artist-5', block: 'border-artist-5/70 hover:bg-muted/50', surface: 'border-artist-5/45 bg-artist-5/[0.08]', monogram: 'bg-artist-5/20 ring-artist-5/50' },
  { dot: 'bg-artist-6', block: 'border-artist-6/70 hover:bg-muted/50', surface: 'border-artist-6/45 bg-artist-6/[0.08]', monogram: 'bg-artist-6/20 ring-artist-6/50' },
  { dot: 'bg-artist-7', block: 'border-artist-7/70 hover:bg-muted/50', surface: 'border-artist-7/45 bg-artist-7/[0.08]', monogram: 'bg-artist-7/20 ring-artist-7/50' },
  { dot: 'bg-artist-8', block: 'border-artist-8/70 hover:bg-muted/50', surface: 'border-artist-8/45 bg-artist-8/[0.08]', monogram: 'bg-artist-8/20 ring-artist-8/50' },
]

const UNASSIGNED: ArtistColor = {
  dot: 'bg-muted-foreground',
  block: 'border-border hover:bg-muted/50',
  surface: 'border-border bg-muted/40',
  monogram: 'bg-muted ring-border',
}

export function artistColor(staffId: string | null): ArtistColor {
  if (!staffId) return UNASSIGNED
  let hash = 0
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? UNASSIGNED
}
