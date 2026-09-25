import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Hook to trigger a temporary "saved" state (e.g., 2.5 seconds) for buttons and visual indicators.
 * Safely cleans up the timer on unmount.
 */
export function useSavedFlash(durationMs = 2500) {
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const triggerSaved = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setSaved(true)
    timerRef.current = setTimeout(() => {
      setSaved(false)
      timerRef.current = null
    }, durationMs)
  }, [durationMs])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { saved, triggerSaved }
}

