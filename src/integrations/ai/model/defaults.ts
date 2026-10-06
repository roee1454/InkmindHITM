import type { anthropic } from '@ai-sdk/anthropic'
import type { Anthropic } from '@anthropic-ai/sdk'

/**
 * Filters out wide primitive types (such as `string` or `string & {}`) to retain only literal union members.
 */
type OnlyLiterals<T> = T extends any ? (string extends T ? never : T) : never

/**
 * Combined known Anthropic models from both `@ai-sdk/anthropic` and `@anthropic-ai/sdk`.
 */
type KnownAnthropicModel = Parameters<typeof anthropic>[0] | Anthropic.Model

/**
 * Strict union of all known Claude Sonnet model IDs provided by Anthropic SDK definitions.
 * Whenever `@anthropic-ai/sdk` or `@ai-sdk/anthropic` are updated (e.g. `pnpm up @anthropic-ai/sdk`),
 * TypeScript automatically knows and autocompletes all available Sonnet model IDs.
 */
export type KnownSonnetModel = Extract<
  OnlyLiterals<KnownAnthropicModel>,
  `${string}sonnet${string}`
>

/**
 * Claude Sonnet model ID.
 * Employs `KnownSonnetModel` for instant IDE autocomplete, while allowing
 * arbitrary strings for day-one zero-day model releases before SDK package bumps.
 */
export type AnthropicSonnetModel = KnownSonnetModel | (string & {})

/**
 * Single hardcoded system-wide AI model.
 * Inkmind CRM runs exclusively on Anthropic Latest Claude Sonnet.
 *
 * 💡 Tip: In your IDE, trigger autocomplete (Ctrl+Space / Cmd+I) inside the quotes
 * to see all available Sonnet models.
 * To check Anthropic's live Models API for newly released models, run `pnpm ai:models`.
 */
export const SYSTEM_AI_MODEL: AnthropicSonnetModel = 'claude-sonnet-5-5'

/**
 * Maximum output tokens limit for AI model generations.
 * Set to null (default) to allow full native output, or a number for testing/benchmarks.
 */
export const SYSTEM_AI_MAX_TOKENS: number | null = null
