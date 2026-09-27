import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

/** Past this share of the sheet's height, letting go closes it. */
const DISTANCE_RATIO = 0.3
/** A flick this fast (px/ms, downward) closes it however short the drag was. */
const FLICK_VELOCITY = 0.5
/** A drag shorter than this is a tap on the handle, never a dismissal. */
const MIN_DISTANCE = 24
/** Settle-back curve, close to the iOS sheet spring. */
const SETTLE = 'translate 320ms cubic-bezier(0.32, 0.72, 0, 1)'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Whether a released drag should close the sheet (pure, so it can be tested without a DOM). */
export function shouldDismiss(distance: number, velocity: number, height: number): boolean {
  if (distance < MIN_DISTANCE) return false
  return distance > height * DISTANCE_RATIO || velocity > FLICK_VELOCITY
}

interface DragState {
  pointerId: number
  startY: number
  lastY: number
  lastT: number
  velocity: number
}

/**
 * Lets a bottom sheet follow the finger from its handle and close when pulled far or flicked,
 * like a native sheet. It moves the panel with the CSS `translate` property, not `transform`:
 * the enter/exit keyframes own `transform` (with `fill-mode-both`), and a separate property
 * composes with them instead of being overridden. That also makes a dismissal slide on from
 * wherever the finger left the panel rather than jumping back first.
 */
export function useDragToDismiss({
  panelRef,
  overlayRef,
  onDismiss,
}: {
  panelRef: RefObject<HTMLElement | null>
  overlayRef: RefObject<HTMLElement | null>
  onDismiss: () => void
}) {
  const drag = useRef<DragState | null>(null)

  const place = (distance: number, animate: boolean) => {
    const panel = panelRef.current
    if (!panel) return
    if (animate && reducedMotion()) animate = false
    panel.style.transition = animate ? SETTLE : 'none'
    panel.style.translate = `0 ${distance}px`
    const overlay = overlayRef.current
    if (overlay) {
      const progress = Math.min(1, distance / (panel.offsetHeight || 1))
      overlay.style.transition = animate ? 'background-color 320ms ease-out' : 'none'
      overlay.style.backgroundColor = `rgb(0 0 0 / ${0.45 * (1 - progress)})`
    }
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { pointerId: event.pointerId, startY: event.clientY, lastY: event.clientY, lastT: event.timeStamp, velocity: 0 }
    event.currentTarget.dataset.dragging = ''
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    const dt = event.timeStamp - state.lastT
    if (dt > 0) state.velocity = (event.clientY - state.lastY) / dt
    state.lastY = event.clientY
    state.lastT = event.timeStamp
    // Upward pulls are ignored: the sheet is anchored to the bottom and has nowhere to go.
    place(Math.max(0, event.clientY - state.startY), false)
  }

  const end = (event: ReactPointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state || state.pointerId !== event.pointerId) return
    drag.current = null
    delete event.currentTarget.dataset.dragging
    const distance = Math.max(0, state.lastY - state.startY)
    // A velocity sampled long before release is stale — the finger stopped, then let go.
    const velocity = event.timeStamp - state.lastT > 80 ? 0 : state.velocity
    if (event.type === 'pointerup' && shouldDismiss(distance, velocity, panelRef.current?.offsetHeight ?? 0)) {
      onDismiss()
    } else {
      place(0, true)
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end }
}
