import { describe, expect, it } from 'vitest'
import { REAL_AI_MODELS } from '@/features/settings/components/ModelSearchSelect'
import { buildGenerationParams, supportsTemperature } from './capabilities'

describe('supportsTemperature', () => {
  for (const { id } of REAL_AI_MODELS) {
    it(`"${id}" accepts temperature (Anthropic models do; only extended thinking conflicts)`, () => {
      expect(supportsTemperature(id)).toBe(true)
    })
  }
})

describe('buildGenerationParams', () => {
  it('passes the dashboard temperature through — dropping it silently was LANG-1', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.7, maxTokens: 500 })).toEqual({
      maxOutputTokens: 500,
      temperature: 0.7,
    })
  })

  it('clamps OpenAI-era settings (0..2) into Anthropic range (0..1)', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 1.4, maxTokens: null })).toEqual({
      temperature: 1,
    })
  })

  it('omits maxOutputTokens when maxTokens is null', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.4, maxTokens: null })).toEqual({
      temperature: 0.4,
    })
  })

  it('omits maxOutputTokens when maxTokens is 0 (unset DB default, not a real cap)', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.4, maxTokens: 0 })).toEqual({
      temperature: 0.4,
    })
  })
})
