import { botTurnScheduler } from '@/lib/debounce-scheduler'

/** One AbortController per conversation. When a new inbound message arrives mid-turn,
 *  webhook calls abortActiveTurn() to signal the in-flight generateText call to stop
 *  early, preventing the model from generating a reply based on stale context. Also
 *  written/cleared directly by run-bot-turn.server.ts's runBotTurnInner, which registers
 *  the controller for the turn it's about to run and removes it when done — both files
 *  must share this exact map for an abort to actually reach the in-flight turn. */
export const activeTurnControllers = new Map<string, AbortController>()

/** Cancel any currently running bot turn for a conversation. Called by the webhook
 *  before re-scheduling the turn so rapid-fire messages don't pile up stale replies.
 *  Returns true if a turn was actually aborted, false if none was running. */
export function abortActiveTurn(conversationId: string): boolean {
  const controller = activeTurnControllers.get(conversationId)
  if (!controller) return false
  controller.abort()
  activeTurnControllers.delete(conversationId)
  return true
}

/**
 * Fully cancels any pending or in-flight bot turn for a conversation.
 * 1. Cancels the in-memory debounce timer (if the customer sent a message within the debounce window).
 * 2. Signals any in-flight LLM generateText call to abort immediately via AbortController.
 */
export function cancelPendingBotTurn(conversationId: string): boolean {
  botTurnScheduler.cancel(conversationId)
  return abortActiveTurn(conversationId)
}

/** Expose the internal controller map for unit tests only. Never call in production code. */
export function _getActiveTurnControllersForTest(): Map<string, AbortController> {
  return activeTurnControllers
}
