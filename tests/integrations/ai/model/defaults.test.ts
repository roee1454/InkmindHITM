import { describe, it, expect } from 'vitest'
import {
  SYSTEM_AI_MODEL,
  SYSTEM_AI_MAX_TOKENS,
  type KnownSonnetModel,
  type AnthropicSonnetModel,
} from '@/integrations/ai/model/defaults'

describe('SYSTEM_AI_MODEL defaults & typing', () => {
  it('exports a valid Sonnet model as default', () => {
    expect(SYSTEM_AI_MODEL).toBe('claude-sonnet-5-5')
    expect(SYSTEM_AI_MODEL.startsWith('claude-sonnet-')).toBe(true)
  })

  it('exports SYSTEM_AI_MAX_TOKENS', () => {
    expect(SYSTEM_AI_MAX_TOKENS).toBeNull()
  })

  it('validates KnownSonnetModel type compatibility', () => {
    const model55: KnownSonnetModel = 'claude-sonnet-5-5'
    const model5: KnownSonnetModel = 'claude-sonnet-5'
    const model46: KnownSonnetModel = 'claude-sonnet-4-6'

    expect(model55).toBe('claude-sonnet-5-5')
    expect(model5).toBe('claude-sonnet-5')
    expect(model46).toBe('claude-sonnet-4-6')

    const flexModel: AnthropicSonnetModel = 'claude-sonnet-future'
    expect(flexModel).toBe('claude-sonnet-future')
  })
})
