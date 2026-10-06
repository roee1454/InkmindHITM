/**
 * One tone vocabulary for text, icons and badges, so the three can never drift apart. Every tone
 * maps to a theme token — none to a raw palette colour. Status tones (success, warning,
 * destructive) report a system outcome; they are never decoration.
 */
export const IM_TONES = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-accent-ink',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  inherit: 'text-inherit',
} as const

export type IMTone = keyof typeof IM_TONES

/** Artist identity colours — they name a person, never a state. Icons only. */
export const IM_ARTIST_TONES = {
  'artist-1': 'text-artist-1',
  'artist-2': 'text-artist-2',
  'artist-3': 'text-artist-3',
  'artist-4': 'text-artist-4',
  'artist-5': 'text-artist-5',
  'artist-6': 'text-artist-6',
  'artist-7': 'text-artist-7',
  'artist-8': 'text-artist-8',
} as const

export type IMArtistTone = keyof typeof IM_ARTIST_TONES
