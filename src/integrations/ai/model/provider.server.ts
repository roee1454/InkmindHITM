import { createAnthropic } from '@ai-sdk/anthropic'

let anthropicProvider: ReturnType<typeof createAnthropic> | null = null

export function getModelInstance(model: string) {
  anthropicProvider ??= createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })
  return anthropicProvider(model)
}
