import type { ReactNode } from 'react'
import { MotionConfig, motion } from 'motion/react'

/**
 * The app's motion vocabulary. Durations and easing come from the same tokens as the CSS
 * (`--duration-*`, `--ease-native` in `styles.css`) so a transition written in Tailwind and
 * one written here cannot drift apart.
 *
 * Three primitives, deliberately: a page, a list, and a row inside that list. Anything that
 * needs more than these should be argued for, not invented inline.
 */

const EASE = [0.16, 1, 0.3, 1] as const

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
} as const

/** Wraps the app once. Honours the OS "reduce motion" setting for every child at a stroke. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE }}>
      {children}
    </MotionConfig>
  )
}

/** A route's content settling in. Movement is small on purpose — this is chrome, not a reveal. */
export const PageTransition = motion.create('div')
export const pageTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.base, ease: EASE },
}

/** A list whose rows arrive in sequence rather than all at once. */
export const stagger = {
  animate: { transition: { staggerChildren: 0.035 } },
}

export const staggerItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.fast, ease: EASE } },
}

export { motion }
