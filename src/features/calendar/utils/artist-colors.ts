export interface ArtistColor {
  dot: string
  block: string
}

/**
 * The one legitimately categorical palette in the app: it identifies *people*, so it must
 * never collapse into the four status roles. Drawn from the theme's `--brand-artist-*` ramp,
 * which is tuned to stay legible and evenly weighted on both the paper and the dark ground.
 */
const PALETTE: ArtistColor[] = [
  { dot: 'bg-artist-1', block: 'border-artist-1/70 hover:bg-muted/50' },
  { dot: 'bg-artist-2', block: 'border-artist-2/70 hover:bg-muted/50' },
  { dot: 'bg-artist-3', block: 'border-artist-3/70 hover:bg-muted/50' },
  { dot: 'bg-artist-4', block: 'border-artist-4/70 hover:bg-muted/50' },
  { dot: 'bg-artist-5', block: 'border-artist-5/70 hover:bg-muted/50' },
  { dot: 'bg-artist-6', block: 'border-artist-6/70 hover:bg-muted/50' },
  { dot: 'bg-artist-7', block: 'border-artist-7/70 hover:bg-muted/50' },
  { dot: 'bg-artist-8', block: 'border-artist-8/70 hover:bg-muted/50' },
]

const UNASSIGNED: ArtistColor = { dot: 'bg-muted-foreground', block: 'border-border hover:bg-muted/50' }

export function artistColor(staffId: string | null): ArtistColor {
  if (!staffId) return UNASSIGNED
  let hash = 0
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? UNASSIGNED
}
