import { describe, expect, it } from 'vitest'
import { WRITE_TOOL_NAMES } from './approval'
import { TOOL_LABELS as ACTION_CARD_LABELS } from '../components/McpActionCard'
import { TOOL_LABELS as TOOL_CALL_CARD_LABELS } from '../components/McpToolCallCard'

/**
 * Structural consistency guard — not business logic. Adding a new MCP write tool means touching
 * three separate places (the `*_WRITE_TOOLS` set, `McpActionCard`'s label map, `McpToolCallCard`'s
 * label map); forgetting one is easy and easy to miss in review, since the UI silently falls back
 * to the raw tool-name identifier instead of failing loudly. This test turns that into a build
 * failure instead of a UI paper cut noticed later.
 */
describe('every registered write tool has UI labels', () => {
  it('has a non-empty set of write tools to check', () => {
    expect(WRITE_TOOL_NAMES.size).toBeGreaterThan(0)
  })

  for (const toolName of WRITE_TOOL_NAMES) {
    it(`"${toolName}" has an McpActionCard label`, () => {
      expect(ACTION_CARD_LABELS[toolName]).toBeTruthy()
    })
    it(`"${toolName}" has an McpToolCallCard label`, () => {
      expect(TOOL_CALL_CARD_LABELS[toolName]).toBeTruthy()
    })
  }
})
