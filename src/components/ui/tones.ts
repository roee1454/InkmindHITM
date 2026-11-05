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

/** Artist identity tones mapped to solid neutral styling */
export const IM_ARTIST_TONES = {
  'artist-1': 'text-foreground',
  'artist-2': 'text-foreground',
  'artist-3': 'text-foreground',
  'artist-4': 'text-foreground',
  'artist-5': 'text-foreground',
  'artist-6': 'text-foreground',
  'artist-7': 'text-foreground',
  'artist-8': 'text-foreground',
} as const

export type IMArtistTone = keyof typeof IM_ARTIST_TONES
