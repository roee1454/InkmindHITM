import { tool } from 'ai'
import type { Tool } from 'ai'
import type { z } from 'zod'
import type PocketBase from 'pocketbase'
import { rankItem } from '@tanstack/match-sorter-utils'
import type { StaffRecord } from '@/integrations/pocketbase/types'
import type { McpActionDiff } from '../types'

/** Ranks items by fuzzy name match (tolerant of typos/partial input, unlike a plain substring
 *  check) and returns them best-match-first — so a staff/customer name search resolves the
 *  closest result instead of returning nothing on a minor misspelling. An empty query returns
 *  items in their original order, since there's nothing to rank against. `rankItem` is the same
 *  ranked-fuzzy-matching primitive TanStack Table uses for its own global filtering. */
export function fuzzySearchByName<T>(items: T[], query: string, getName: (item: T) => string): T[] {
  const q = query.trim()
  if (!q) return items
  return items
    .map((item) => ({ item, rank: rankItem(getName(item) || '', q).rank }))
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item)
}

export interface McpToolContext {
  su: PocketBase
  staff: StaffRecord
  /** Write tools never mutate — they push a proposal here instead. `agent.ts` turns each entry
   *  into a `pending` `mcp_actions` row after the model finishes its turn. This is the single
   *  chokepoint that makes "no write tool executes on the first call" true by construction,
   *  rather than by every tool server remembering to check. */
  proposals: Array<{ toolName: string; args: Record<string, unknown>; diff: McpActionDiff }>
}

/** Read tools: execute immediately, never touch `ctx.proposals`. */
export function mcpReadTool<T extends z.ZodTypeAny>(
  description: string,
  inputSchema: T,
  execute: (input: z.infer<T>) => Promise<unknown>,
): Tool {
  return tool({
    description,
    inputSchema,
    execute: async (input) => {
      try {
        return await execute(input as z.infer<T>)
      } catch (error) {
        console.error('[MCP Tool Error]', error)
        // Surface the real message when the tool deliberately threw one (e.g. "customer not
        // found") — swallowing it into a generic string here hid every specific error tools
        // already write, both from the model and (through it) from the person using the chat.
        return { status: 'error', message: error instanceof Error ? error.message : 'שגיאה בגישה לנתוני הסטודיו.' }
      }
    },
  })
}

/** Write tools: `computeDiff` only *previews* the change (must not mutate anything) and returns
 *  a human-readable diff. The actual mutation lives in each tool server's `commit*Action`
 *  function, called only from `approval.ts` once the owner taps "אשר ובצע". */
export function mcpWriteTool<T extends z.ZodTypeAny>(
  ctx: McpToolContext,
  toolName: string,
  description: string,
  inputSchema: T,
  computeDiff: (input: z.infer<T>) => Promise<McpActionDiff>,
): Tool {
  return tool({
    description,
    inputSchema,
    execute: async (input) => {
      try {
        const diff = await computeDiff(input as z.infer<T>)
        ctx.proposals.push({ toolName, args: input as Record<string, unknown>, diff })
        return {
          status: 'pending_approval',
          message: `הפעולה "${diff.summary}" הוצגה לבעלים לאישור. אל תניחו שהיא כבר בוצעה — היא תתבצע רק אם וכאשר הבעלים ילחץ/תלחץ "אשר ובצע".`,
        }
      } catch (error) {
        console.error('[MCP Tool Error]', error)
        // Same reasoning as `mcpReadTool` above — a write tool's own validation (availability
        // checks, missing phone number, permission checks, ...) throws a specific, actionable
        // Hebrew message; only fall back to the generic one for a genuinely unexpected error.
        return { status: 'error', message: error instanceof Error ? error.message : 'שגיאה בהכנת הפעולה להצגה.' }
      }
    },
  })
}
