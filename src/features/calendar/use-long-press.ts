import { useRef } from 'react'
import type { PointerEvent } from 'react'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 10

/** Long-press vs. tap on the same element — a long-press fires `onLongPress` and swallows the
 *  tap; anything shorter, or a press that moves too far (a scroll), falls through to `onTap`. */
export function useLongPress(onLongPress: () => void, onTap: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0 })

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onPointerDown: (e: PointerEvent) => {
      firedRef.current = false
      startRef.current = { x: e.clientX, y: e.clientY }
      clear()
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: PointerEvent) => {
      const dx = Math.abs(e.clientX - startRef.current.x)
      const dy = Math.abs(e.clientY - startRef.current.y)
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clear()
    },
    onPointerUp: () => clear(),
    onPointerCancel: () => clear(),
    onClick: () => {
      if (firedRef.current) {
        firedRef.current = false
        return
      }
      onTap()
    },
  }
}
