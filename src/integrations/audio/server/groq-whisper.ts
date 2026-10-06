/**
 * Groq Whisper Speech-to-Text Pipeline.
 * Transcribes voice messages and audio notes in ~250ms using
 * Groq's high-speed Whisper Large v3 Turbo inference.
 * Supports auto-detection across languages (Hebrew, English, Russian, etc.).
 */

export interface TranscriptionResult {
  text: string
  duration?: number
}

export interface TranscribeOptions {
  filename?: string
  language?: string
  prompt?: string
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const DEFAULT_MODEL = 'whisper-large-v3-turbo'

export const DEFAULT_WHISPER_PROMPT =
  'סטודיו קעקועים אינקמיינד, קעקוע, סקיצה, פירסינג, פלאש, פיין ליין, ריאליזם, מקדמה, ביט, פייבוקס, Inkmind Tattoo'

export async function transcribeAudioWithGroq(
  audioInput: Blob | File | Buffer | Uint8Array,
  filenameOrOptions?: string | TranscribeOptions,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    console.warn('[groq-whisper] GROQ_API_KEY is not configured; skipping audio transcription.')
    return ''
  }

  const options: TranscribeOptions =
    typeof filenameOrOptions === 'string'
      ? { filename: filenameOrOptions }
      : filenameOrOptions ?? {}

  const filename = options.filename ?? 'voice_note.ogg'
  const prompt = options.prompt ?? DEFAULT_WHISPER_PROMPT

  const formData = new FormData()

  if (audioInput instanceof Blob) {
    formData.append('file', audioInput, filename)
  } else if (Buffer.isBuffer(audioInput) || audioInput instanceof Uint8Array) {
    const arrayBuffer = audioInput.buffer.slice(
      audioInput.byteOffset,
      audioInput.byteOffset + audioInput.byteLength,
    ) as ArrayBuffer
    const blob = new Blob([arrayBuffer], { type: 'audio/ogg' })
    formData.append('file', blob, filename)
  } else {
    throw new Error('Unsupported audio input type for transcription')
  }

  formData.append('model', DEFAULT_MODEL)
  // Bug 32: If language is not specified, omit language so Whisper auto-detects English, Russian, etc.
  if (options.language) {
    formData.append('language', options.language)
  }
  formData.append('response_format', 'json')
  // Bug 52: Contextual prompt with accurate studio terms without fictitious names
  formData.append('prompt', prompt)

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`[groq-whisper] HTTP error ${res.status}: ${errText}`)
      return ''
    }

    const data = (await res.json()) as { text?: string }
    return data.text ? data.text.trim() : ''
  } catch (err) {
    console.error('[groq-whisper] Transcription request failed:', err)
    return ''
  }
}
