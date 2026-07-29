import { generateText } from 'ai'
import { buildGenerationParams } from './capabilities'
import { getModelInstance } from './providers.server'

export interface GenerateAiReplyInput {
  model: string
  systemInstructions: string
  temperature: number
  maxTokens: number | null
  prompt: string
}

export interface GenerateAiReplyResult {
  text: string
  usage: { inputTokens: number | undefined; outputTokens: number | undefined }
}

export async function generateAiReply({
  model,
  systemInstructions,
  temperature,
  maxTokens,
  prompt,
}: GenerateAiReplyInput): Promise<GenerateAiReplyResult> {
  const modelInstance = getModelInstance(model)

  // No cacheControl here: this is a one-shot utility call (nothing shares its prefix),
  // and call-level providerOptions never reached the provider anyway — cache breakpoints
  // must sit on individual system/history messages (see agent.server.ts).
  const result = await generateText({
    model: modelInstance,
    system: systemInstructions || undefined,
    messages: [{ role: 'user' as const, content: prompt }],
    ...buildGenerationParams(model, { temperature, maxTokens }),
  })
  return {
    text: result.text,
    usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
  }
}
