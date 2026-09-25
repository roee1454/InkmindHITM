/**
 * Public entry point for the WhatsApp AI agent's orchestration core — re-exports the
 * split-out modules under ./engine/ so every existing `from '@/integrations/ai/agent.server'`
 * import keeps working unchanged. See docs/architecture.md for the split rationale.
 *
 * `.server.ts` suffix for the same reason as `model/generate-once.server.ts` — the Anthropic
 * provider (and thus `ANTHROPIC_API_KEY`) must never be reachable from a client bundle.
 */

export * from './engine/run-bot-turn.server'
export * from './engine/turn-cancellation.server'
export * from './engine/history'
export * from './engine/text-cleanup'
export * from './engine/escalation.server'
