import { useEffect, useRef, useState } from 'react'

/**
 * Divides whatever height the screen actually gives a time grid between its hour rows, so a short
 * working day fills a full-bleed screen instead of ending in dead space (track-b B6.8). Rows never
 * shrink below `minRowHeight`; a long day still scrolls.
 *
 * Measures the scroll container, whose height its parent fixes, rather than the rows themselves —
 * measuring the rows would feed their own growth back into the observer.
 */
export function useFillRowHeight(rowCount: number, minRowHeight: number) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const [availableHeight, setAvailableHeight] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setAvailableHeight(el.clientHeight - (headerRef.current?.offsetHeight ?? 0))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const rowHeight = availableHeight > 0 ? Math.max(minRowHeight, Math.floor(availableHeight / rowCount)) : minRowHeight
  return { scrollRef, headerRef, rowHeight }
}
