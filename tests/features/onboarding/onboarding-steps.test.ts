import { describe, it, expect } from 'vitest'
import {
  ONBOARDING_STEPS,
  TOTAL_ONBOARDING_STEPS,
  getStepByNumber,
  progressPercent,
} from '@/features/onboarding/utils/onboarding-steps'

describe('onboarding-steps (7 unified steps)', () => {
  it('defines 7 total onboarding steps in correct order', () => {
    expect(TOTAL_ONBOARDING_STEPS).toBe(7)
    expect(ONBOARDING_STEPS).toHaveLength(7)

    expect(ONBOARDING_STEPS[0]?.id).toBe('studio')
    expect(ONBOARDING_STEPS[0]?.stepNumber).toBe(1)

    expect(ONBOARDING_STEPS[1]?.id).toBe('admin')
    expect(ONBOARDING_STEPS[1]?.stepNumber).toBe(2)

    expect(ONBOARDING_STEPS[2]?.id).toBe('profile-links')
    expect(ONBOARDING_STEPS[2]?.stepNumber).toBe(3)

    expect(ONBOARDING_STEPS[3]?.id).toBe('hours')
    expect(ONBOARDING_STEPS[3]?.stepNumber).toBe(4)

    expect(ONBOARDING_STEPS[4]?.id).toBe('payments')
    expect(ONBOARDING_STEPS[4]?.stepNumber).toBe(5)

    expect(ONBOARDING_STEPS[5]?.id).toBe('calendar')
    expect(ONBOARDING_STEPS[5]?.stepNumber).toBe(6)

    expect(ONBOARDING_STEPS[6]?.id).toBe('team')
    expect(ONBOARDING_STEPS[6]?.stepNumber).toBe(7)
  })

  it('retrieves steps by number', () => {
    expect(getStepByNumber(1)?.id).toBe('studio')
    expect(getStepByNumber(2)?.id).toBe('admin')
    expect(getStepByNumber(3)?.id).toBe('profile-links')
    expect(getStepByNumber(4)?.id).toBe('hours')
    expect(getStepByNumber(5)?.id).toBe('payments')
    expect(getStepByNumber(6)?.id).toBe('calendar')
    expect(getStepByNumber(7)?.id).toBe('team')
    expect(getStepByNumber(8)).toBeUndefined()
  })

  it('calculates progressPercent accurately out of 7', () => {
    expect(progressPercent(1)).toBe(14) // 1/7 * 100
    expect(progressPercent(2)).toBe(29) // 2/7 * 100
    expect(progressPercent(3)).toBe(43) // 3/7 * 100
    expect(progressPercent(4)).toBe(57) // 4/7 * 100
    expect(progressPercent(5)).toBe(71) // 5/7 * 100
    expect(progressPercent(6)).toBe(86) // 6/7 * 100
    expect(progressPercent(7)).toBe(100) // 7/7 * 100
  })
})
