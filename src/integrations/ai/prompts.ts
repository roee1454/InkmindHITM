/**
 * Public entry point for system prompt assembly — re-exports the split-out modules under
 * ./prompts/ so every existing `from '@/integrations/ai/prompts'` import keeps working
 * unchanged. See docs/architecture.md for the split rationale.
 *
 * Ported and adapted from a prior validated prototype (raw OpenAI SDK, same domain) — the
 * guardrail content (age/health checks, anti-forgery staff-authority rule, anatomical/
 * placement/ink sanity checks, security boundaries) is generic tattoo-studio-agent content,
 * not tied to that prototype's specific tool names, so it's reproduced with only the tool/
 * reason names adapted to this app's actual set. Assembly order every turn: base prompt +
 * state-specific block (or a handoff-restriction block instead, when escalated) + persona/
 * tone suffix + temporal reference block — never persisted to `messages`.
 *
 * Register note (LANG-3): every instruction is written in informal second-person singular
 * Hebrew, matching the persona the prompt demands. The model imitates the register it reads
 * at least as much as the register it's told to use — an earlier version wrote the rules in
 * formal-plural ("שאלו", "קראו") and the bot's Hebrew came out sounding like a government
 * office. Keep new instructions in the same casual singular voice.
 *
 * Length budget (LANG-2): the message-length rule lives in ONE place — rule 1 of
 * <whatsapp_persona> (prompts/base-prompt.ts). Never add a second word-count anywhere in
 * this module tree; two competing budgets made the model pick the looser one.
 */

export * from './prompts/types'
export * from './prompts/base-prompt'
export * from './prompts/state-prompts'
export * from './prompts/tool-explanations'
export * from './prompts/temporal'
export * from './prompts/build-system-prompt'
