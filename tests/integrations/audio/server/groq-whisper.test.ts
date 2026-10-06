import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { transcribeAudioWithGroq } from '@/integrations/audio/server/groq-whisper'

describe('transcribeAudioWithGroq', () => {
  const ORIGINAL_KEY = process.env.GROQ_API_KEY

  beforeEach(() => {
    process.env.GROQ_API_KEY = 'gsk_test_key_123'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.GROQ_API_KEY = ORIGINAL_KEY
    vi.restoreAllMocks()
  })

  it('returns empty string if GROQ_API_KEY is not set', async () => {
    delete process.env.GROQ_API_KEY
    const blob = new Blob(['fake-audio-bytes'], { type: 'audio/ogg' })
    const result = await transcribeAudioWithGroq(blob)
    expect(result).toBe('')
  })

  it('transcribes audio successfully and returns trimmed Hebrew text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: '  היי אני רוצה לתאם קעקוע פיין ליין קטן   ' }),
    })
    globalThis.fetch = fetchMock

    const blob = new Blob(['fake-audio-bytes'], { type: 'audio/ogg' })
    const result = await transcribeAudioWithGroq(blob)

    expect(result).toBe('היי אני רוצה לתאם קעקוע פיין ליין קטן')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer gsk_test_key_123',
        },
      }),
    )
  })

  it('handles API errors gracefully and returns empty string', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })
    globalThis.fetch = fetchMock

    const blob = new Blob(['fake-audio-bytes'], { type: 'audio/ogg' })
    const result = await transcribeAudioWithGroq(blob)

    expect(result).toBe('')
  })
})

