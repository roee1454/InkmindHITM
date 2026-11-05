import { useEffect } from 'react'

export type ThemeMode = 'light'

/**
 * The system is locked to Light Mode only.
 * Ensures the `dark` class is stripped from documentElement.
 */
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    try {
      localStorage.removeItem('ui-mode')
    } catch {}
  }, [])

  return { mode: 'light' as const, setMode: () => {} }
}
