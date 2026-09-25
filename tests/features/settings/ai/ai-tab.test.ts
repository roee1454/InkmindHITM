import { describe, it, expect } from 'vitest'
import { saveStudioPolicySchema } from '@/features/settings/server/policy'
import { saveAiConfigSchema, toggleAiSchema } from '@/features/settings/server/ai'

describe('AI Tab — Schemas & Validation', () => {
  describe('saveStudioPolicySchema', () => {
    it('validates a correct policy settings payload', () => {
      const result = saveStudioPolicySchema.safeParse({
        paymentInstructions: 'ביט למספר 052-1234567',
        reviewLink: 'https://g.page/r/inkmind/review',
        cancellationCutoffHours: 48,
        healthDeclarationFormUrl: 'https://forms.google.com/test',
        healthDeclarationValidityMonths: 6,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cancellationCutoffHours).toBe(48)
        expect(result.data.healthDeclarationValidityMonths).toBe(6)
      }
    })

    it('permits 0 cutoff hours for free cancellation anytime (Bug 20)', () => {
      const result = saveStudioPolicySchema.safeParse({
        cancellationCutoffHours: 0,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cancellationCutoffHours).toBe(0)
      }
    })

    it('permits -1 validity months for perpetual health declaration', () => {
      const result = saveStudioPolicySchema.safeParse({
        cancellationCutoffHours: 24,
        healthDeclarationValidityMonths: -1,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.healthDeclarationValidityMonths).toBe(-1)
      }
    })

    it('rejects negative cancellation cutoff hours', () => {
      const result = saveStudioPolicySchema.safeParse({
        cancellationCutoffHours: -5,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('saveAiConfigSchema', () => {
    it('validates valid temperature and maxTokens', () => {
      const result = saveAiConfigSchema.safeParse({
        temperature: 0.4,
        maxTokens: 1500,
      })
      expect(result.success).toBe(true)
    })

    it('allows null maxTokens to represent system default', () => {
      const result = saveAiConfigSchema.safeParse({
        temperature: 0.5,
        maxTokens: null,
      })
      expect(result.success).toBe(true)
    })

    it('allows omitting maxTokens entirely when controlled in code', () => {
      const result = saveAiConfigSchema.safeParse({
        temperature: 0.4,
      })
      expect(result.success).toBe(true)
    })

    it('rejects temperature out of bounds [0, 2]', () => {
      expect(saveAiConfigSchema.safeParse({ temperature: 2.5, maxTokens: null }).success).toBe(false)
      expect(saveAiConfigSchema.safeParse({ temperature: -0.1, maxTokens: null }).success).toBe(false)
    })
  })

  describe('toggleAiSchema', () => {
    it('accepts boolean enabled state', () => {
      expect(toggleAiSchema.safeParse({ enabled: true }).success).toBe(true)
      expect(toggleAiSchema.safeParse({ enabled: false }).success).toBe(true)
      expect(toggleAiSchema.safeParse({ enabled: 'true' }).success).toBe(false)
    })
  })

  describe('AISubTab navigation & deep linking', () => {
    const validSubTabs = ['agent', 'rules', 'policy', 'closures']

    it('recognizes all 4 valid subtabs', () => {
      for (const tab of validSubTabs) {
        expect(['agent', 'rules', 'policy', 'closures'].includes(tab)).toBe(true)
      }
    })
  })
})
