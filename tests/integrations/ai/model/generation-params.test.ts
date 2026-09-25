import { describe, expect, it } from 'vitest'
import { buildGenerationParams, supportsTemperature } from '@/integrations/ai/model/generation-params'

describe('supportsTemperature', () => {
  it('"claude-sonnet-5" rejects temperature because it uses default adaptive thinking', () => {
    expect(supportsTemperature('claude-sonnet-5')).toBe(false)
  })

  it('other models accept temperature', () => {
    expect(supportsTemperature('claude-haiku-4-5-20251001')).toBe(true)
    expect(supportsTemperature('claude-3-5-sonnet-20241022')).toBe(true)
  })
})

describe('buildGenerationParams', () => {
  it('omits temperature for claude-sonnet-5 to prevent Anthropic 400 error', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.7, maxTokens: 500 })).toEqual({
      maxOutputTokens: 500,
    })
  })

  it('passes and clamps temperature for models that support it', () => {
    expect(buildGenerationParams('claude-3-5-sonnet-20241022', { temperature: 0.7, maxTokens: 500 })).toEqual({
      maxOutputTokens: 500,
      temperature: 0.7,
    })
    expect(buildGenerationParams('claude-3-5-sonnet-20241022', { temperature: 1.4, maxTokens: null })).toEqual({
      temperature: 1,
    })
  })

  it('omits maxOutputTokens when maxTokens is null', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.4, maxTokens: null })).toEqual({})
  })

  it('omits maxOutputTokens when maxTokens is 0 (unset DB default, not a real cap)', () => {
    expect(buildGenerationParams('claude-sonnet-5', { temperature: 0.4, maxTokens: 0 })).toEqual({})
  })
})
