import * as React from 'react'

/**
 * Tailwind v4 emits range syntax (`@media (width < 64rem)`) rather than `max-width`, so these
 * strings are written to match exactly what the `max-lg:` variant compiles to. Using a
 * different-but-equivalent string (e.g. `(max-width: 1023.98px)`) produces a sub-pixel band
 * where a JS branch and its matching CSS class disagree.
 */
export const MEDIA = {
  maxSm: '(width < 40rem)',
  maxMd: '(width < 48rem)',
  maxLg: '(width < 64rem)',
  coarsePointer: '(pointer: coarse)',
} as const

export function useMediaQuery(query: string, serverFallback = false): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverFallback,
  )
}

/**
 * Below Tailwind's `lg` — the shell's desktop/mobile split point.
 *
 * Server-renders `false` (the desktop branch) and corrects on hydration, so prefer CSS
 * (`lg:hidden` / `hidden lg:flex`) for anything purely visual. Reserve this for cases where
 * the DOM tree must genuinely differ: the conversations single-pane swap, the calendar's
 * visible-days array, and the leads pointer check.
 */
export const useIsMobile = () => useMediaQuery(MEDIA.maxLg)

/** Touch/pen primary input — used to disable mouse-only drag and pan handlers. */
export const useIsCoarsePointer = () => useMediaQuery(MEDIA.coarsePointer)
