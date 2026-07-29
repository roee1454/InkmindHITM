export interface ArtistColor {
  dot: string
  block: string
}

const PALETTE: ArtistColor[] = [
  { dot: 'bg-violet-400', block: 'border-violet-400/70 hover:bg-muted/50' },
  { dot: 'bg-emerald-400', block: 'border-emerald-400/70 hover:bg-muted/50' },
  { dot: 'bg-sky-400', block: 'border-sky-400/70 hover:bg-muted/50' },
  { dot: 'bg-amber-400', block: 'border-amber-400/70 hover:bg-muted/50' },
  { dot: 'bg-rose-400', block: 'border-rose-400/70 hover:bg-muted/50' },
  { dot: 'bg-teal-400', block: 'border-teal-400/70 hover:bg-muted/50' },
  { dot: 'bg-fuchsia-400', block: 'border-fuchsia-400/70 hover:bg-muted/50' },
  { dot: 'bg-lime-400', block: 'border-lime-400/70 hover:bg-muted/50' },
]

const UNASSIGNED: ArtistColor = { dot: 'bg-stone-500', block: 'border-stone-400 hover:bg-muted/50' }

export function artistColor(staffId: string | null): ArtistColor {
  if (!staffId) return UNASSIGNED
  let hash = 0
  for (let i = 0; i < staffId.length; i++) {
    hash = (hash * 31 + staffId.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? UNASSIGNED
}
