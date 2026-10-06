import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'ui-mode'

const MODES: ReadonlySet<string> = new Set<ThemeMode>(['light', 'dark', 'system'])

function readStored(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (raw && MODES.has(raw)) return raw as ThemeMode
  } catch {}
  return 'system'
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * The only owner of the light/dark preference. It is per-device (localStorage), not
 * per-studio: two artists sharing one studio record should not fight over it, and the
 * toggle stays instant with no server round-trip.
 *
 * `__root.tsx` runs the same logic in a blocking head script so the first paint is
 * already correct; this hook keeps it in sync afterwards.
 */
export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>('system')

  // localStorage is unavailable during SSR, so the real value is read after mount.
  useEffect(() => {
    setModeState(readStored())
  }, [])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    apply(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {}
  }, [])

  // Only "system" tracks the OS; an explicit choice must not be overridden by it.
  useEffect(() => {
    if (mode !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  return { mode, setMode }
}
