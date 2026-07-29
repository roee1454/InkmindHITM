/**
 * Generation-parameter policy per model family. Replaces WAHA's `isReasoningModel()`
 * gate: that existed because OpenAI's reasoning models reject a non-default
 * `temperature` (400 error). Anthropic models accept `temperature` — it only conflicts
 * with extended thinking, which this app doesn't enable — so the dashboard's
 * `ai_temperature` setting is passed through. Silently dropping it was LANG-1: the
 * most direct lever on the bot's Hebrew tone was wired to nothing.
 */
export function supportsTemperature(_model: string): boolean {
  return true // every Claude model this app can select accepts temperature
}

export interface GenerationParams {
  maxOutputTokens?: number
  temperature?: number
}

export function buildGenerationParams(
  model: string,
  { temperature, maxTokens }: { temperature: number; maxTokens: number | null },
): GenerationParams {
  const params: GenerationParams = {}
  // `0` means "no cap" in this app's settings UI (empty input, unset DB default), not
  // "zero tokens" — treat it like null.
  if (maxTokens != null && maxTokens > 0) params.maxOutputTokens = maxTokens
  // Clamp to Anthropic's 0..1 range — settings saved in the OpenAI era could hold up to 2.
  if (supportsTemperature(model)) {
    params.temperature = Math.min(Math.max(temperature, 0), 1)
  }
  return params
}
