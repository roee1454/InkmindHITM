/**
 * Single hardcoded system-wide AI model.
 * Inkmind CRM runs exclusively on Anthropic Claude Sonnet 5.
 */
export const SYSTEM_AI_MODEL = 'claude-sonnet-5'

/**
 * Maximum output tokens limit for AI model generations.
 * Set to null (default) to allow full native output, or a number for testing/benchmarks.
 */
export const SYSTEM_AI_MAX_TOKENS: number | null = null
