/**
 * Generation-parameter policy per model family.
 *
 * Anthropic's Claude Sonnet 5 ('claude-sonnet-5') features adaptive thinking by default
 * and strictly rejects non-default sampling parameters (temperature, top_p, top_k),
 * returning an HTTP 400 error if they are passed.
 * Therefore, supportsTemperature returns false for 'claude-sonnet-5' to omit temperature.
 */
export function supportsTemperature(model: string): boolean {
  if (model === 'claude-sonnet-5') {
    return false
  }
  return true
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
