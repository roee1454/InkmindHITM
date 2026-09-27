import { describe, expect, it } from 'vitest'
import { shouldDismiss } from '@/hooks/useDragToDismiss'

describe('shouldDismiss', () => {
  const height = 600

  it('closes once the sheet is pulled past 30% of its height', () => {
    expect(shouldDismiss(181, 0, height)).toBe(true)
    expect(shouldDismiss(179, 0, height)).toBe(false)
  })

  it('closes on a fast downward flick even when the pull was short', () => {
    expect(shouldDismiss(60, 0.8, height)).toBe(true)
    expect(shouldDismiss(60, 0.3, height)).toBe(false)
  })

  it('treats a tiny movement as a tap, however fast', () => {
    expect(shouldDismiss(10, 2, height)).toBe(false)
  })
})
