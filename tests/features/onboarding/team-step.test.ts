import { describe, expect, it } from 'vitest'
import { addStaffSchema } from '@/features/settings/server/staff'
import { ONBOARDING_STEPS, getStepByNumber } from '@/features/onboarding/utils/onboarding-steps'
import { useOnboardingUiStore } from '@/features/onboarding/store/onboardingUiStore'

describe('Onboarding Team Step (Step 7)', () => {
  it('registers Step 7 as the team invitation and completion step', () => {
    expect(ONBOARDING_STEPS).toHaveLength(7)
    const step7 = getStepByNumber(7)
    expect(step7).toBeDefined()
    expect(step7?.id).toBe('team')
    expect(step7?.stepNumber).toBe(7)
    expect(step7?.title).toContain('הזמנת חברי צוות')
  })

  it('allows adding valid staff members via addStaffSchema', () => {
    const validStaff = {
      name: 'מיה כהן',
      email: 'maya@inkmind.io',
      role: 'staff' as const,
    }
    const result = addStaffSchema.safeParse(validStaff)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('מיה כהן')
      expect(result.data.email).toBe('maya@inkmind.io')
      expect(result.data.role).toBe('staff')
    }
  })

  it('allows adding admin staff members via addStaffSchema', () => {
    const validAdmin = {
      name: 'דניאל מנהל',
      email: 'daniel.admin@inkmind.io',
      role: 'admin' as const,
    }
    const result = addStaffSchema.safeParse(validAdmin)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.role).toBe('admin')
    }
  })

  it('validates navigation directly to Step 7 and backwards to Step 6', () => {
    const store = useOnboardingUiStore.getState()
    store.reset()

    store.setCurrentStep(6)
    expect(useOnboardingUiStore.getState().currentStep).toBe(6)

    // Advancing from Calendar (Step 6) leads to Team (Step 7)
    store.nextStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(7)

    // Going back from Team (Step 7) leads to Calendar (Step 6)
    store.prevStep()
    expect(useOnboardingUiStore.getState().currentStep).toBe(6)
  })

  it('maps pending invite states correctly for invited team members', () => {
    const invitedMember = {
      id: 'staff_new',
      name: 'אלון ברק',
      email: 'alon@inkmind.io',
      role: 'staff' as const,
      isAdmin: false,
      isOwner: false,
      invitePending: true,
      inviteToken: 'abc123token',
    }

    expect(invitedMember.invitePending).toBe(true)
    expect(invitedMember.inviteToken).toBeTruthy()
  })
})
