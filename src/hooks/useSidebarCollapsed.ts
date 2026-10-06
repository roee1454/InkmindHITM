import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'sidebar-collapsed'

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * The desktop sidebar's icon-only rail state (track-b B6.6). Per-device (localStorage), not
 * per-account: a single studio's staff don't share browsers, so there's no reason to pay for a
 * server round-trip or a staff field just to remember a rail width.
 */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsedState] = useState(false)

  // localStorage is unavailable during SSR, so the real value is read after mount.
  useEffect(() => {
    setCollapsedState(readStored())
  }, [])

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {}
      return next
    })
  }, [])

  return { collapsed, toggle }
}
