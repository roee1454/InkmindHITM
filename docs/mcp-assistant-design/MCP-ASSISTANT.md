# Handoff: MCP Assistant (owner-facing chat)

**Design source:** `Inkmind MCP Assistant.dc.html`
**Depends on:** the Native Mobile Redesign bundle (styles.css, UI-PRIMITIVES.md) — this feature is skinned
with the same tokens, not a new visual system.

---

## 1. What this is

A second, separate chat surface: a small assistant bubble that lives on every authenticated screen and lets
the **studio owner** ask questions about their own data ("who hasn't paid a deposit this week?") and, with
explicit approval, take actions (reschedule appointments, send reminders). It opens as a bottom sheet on
mobile and a popover on desktop, and it keeps conversation history behind a toggle in its own title bar.

**This is not the customer-facing WhatsApp bot.** They must be two fully separate services. Read §2 before
building anything — merging them is the one mistake this doc exists to prevent.

## 2. Two agents, never one

The app already runs one AI agent: the **Customer Agent**, which replies to studio customers on WhatsApp
(`src/integrations/ai/prompts.ts`, `src/integrations/ai/tools/*.server.ts`, driven by
`src/features/conversations/server/messages.ts` + `state-machine.ts`). This feature introduces a second,
independent agent:

| | **Customer Agent** (existing) | **MCP Agent** (new) |
| --- | --- | --- |
| Talks to | End customers, over WhatsApp | The studio owner/staff, in-app |
| Identity it acts as | The studio (a persona) | An internal tool, addressed to staff |
| System prompt | `src/integrations/ai/prompts.ts` | **new**, `src/features/mcp-assistant/server/prompts.ts` |
| Tools | Booking, quoting, artist lookup — scoped to *one conversation's* customer | MCP tool servers scoped to the *whole studio's* data (§4) |
| Data it can read | The current conversation + that customer's record | Anything the logged-in staff member is permitted to see |
| Write actions | Auto-executes booking-flow steps per the state machine | **Always** pauses for explicit human approval (§5) |
| Conversation storage | `conversations` / `messages` (existing) | `mcp_conversations` / `mcp_messages` (new, §7) |
| Model/route | Existing chat completion call in `messages.ts` | Its own server route — do not add this traffic to `messages.ts` |

**Why separate, concretely:**
- A prompt-injection attempt from a customer message must never be able to reach owner-scoped tools (calendar
  writes, payment data across *all* customers, staff management). Two agents with two tool sets makes that
  impossible by construction, not by prompt wording.
- The Customer Agent's context window is one conversation. The MCP Agent's is the whole studio. Sharing a
  prompt/tool file means every change to one risks the other.
- Rate limits, model choice, and cost tracking need to be attributable per-surface.

**Concretely, do not:**
- Import anything from `src/integrations/ai/prompts.ts` or `tools/*.server.ts` into the MCP agent's server code.
- Let the MCP Agent's tool calls write into `conversations`/`messages` — those tables are the customer
  channel's. If the MCP Agent sends a WhatsApp reminder, it calls the *same low-level send function* the
  Customer Agent uses, but as an explicit, staff-approved tool call — not by pretending to be that agent.
- Give the MCP Agent a system prompt that says anything about "being the studio" — its persona is "an
  assistant for the person running the studio," first person to staff, third person about customers.

## 3. UI: what's reused vs. new

The app already has a full chat UI vocabulary from the customer conversation feature. Reuse it; do not
reinvent bubbles, composers, or media viewers.

**Reused as-is (import, don't fork):**
- `src/features/conversations/components/MessageBubble.tsx` — inbound/outbound bubble styling is identical.
  The MCP Agent's replies render as inbound bubbles; the owner's messages as outbound.
- Composer geometry — attach / input / send row from `ConversationThread.tsx`. Extract it to a shared
  `ChatComposer.tsx` if it isn't already standalone (check before duplicating).
- `src/features/conversations/lib/format.ts` — `tabular-nums` date/time/price formatting.
- `src/components/ui/sheet.tsx` (mobile) / `src/components/ui/popover.tsx` (desktop) — the shell itself.
- Design tokens from `src/styles.css` — radii, shadows, status-pill colors (§6 of the main README). No new
  colors.

**New, specific to this feature (`src/features/mcp-assistant/`):**
- `McpBubble.tsx` — the floating trigger (58px circle, `sparkles` icon, connection dot, working/needs-approval
  states — see MCP‑01 in the reference file).
- `McpPanel.tsx` — the sheet/popover shell + header (title = history toggle chevron, new-chat icon, close),
  wrapping the reused composer and message list.
- `McpHistoryList.tsx` — the "title tapped" state: search + new-chat + grouped conversation list (MCP‑03/05).
- `McpToolCallCard.tsx` — the read-tool result card (server name, tool id in mono, row count/duration, "show
  data" — MCP‑02). This has no equivalent in the customer chat; customers never see tool calls.
- `McpActionCard.tsx` — the write-tool approval card, in three states: **pending** (diff + approve/edit
  buttons, MCP‑06), **editing** (inline form replacing the diff, composer locked, MCP‑07/08), **done** (locked,
  emerald, undo window, MCP‑09). This is the one genuinely new interaction pattern — model it as a small
  state machine (`pending | editing | executing | done | cancelled`), not as conditional JSX sprinkled through
  one component.
- `useMcpConversation.ts` — hook: loads/streams messages for the open MCP conversation, exposes `sendMessage`,
  `approveAction`, `editAction`, `cancelAction`.
- `store/mcpUiStore.ts` (Zustand, same pattern as `conversationsUiStore.ts`) — `isOpen`, `panelMode: 'chat' |
  'history'`, `activeConversationId`, `draftEdits` (per pending action, so an in-progress edit survives the
  sheet being minimized).

## 4. MCP tool servers

"MCP" here means the agent's tools are organized the same way your calendar/leads/chat/payments domains
already are — one **tool server** per domain, each exposing a small set of typed functions. This keeps the
tool surface auditable and lets you add WhatsApp as a fifth domain later without touching the other four.

```
src/features/mcp-assistant/
  server/
    prompts.ts              — MCP Agent system prompt (owner persona, tone, refusal rules)
    agent.ts                 — the completion loop: receives owner message, calls the model with the
                               tool set below, streams the response, executes approved actions
    tool-servers/
      calendar.server.ts     — read: listAppointments, findFreeSlots · write: reschedule, cancel
      leads.server.ts        — read: searchLeads, getLead · write: updateStage, assignArtist
      payments.server.ts     — read: listPayments, listUnpaidDeposits · write: none yet (refunds are manual)
      messaging.server.ts    — read: none · write: sendReminder, sendUpdateMessage (channel-agnostic, §8)
    approval.ts               — shared `requiresApproval(toolName)` classifier + action-record persistence
  types.ts                    — McpConversation, McpMessage, McpToolCall, McpAction
```

**Read vs. write is the only trust boundary that matters:**
- Read tools (`list*`, `search*`, `get*`, `find*`) execute immediately, no approval, render as
  `McpToolCallCard`.
- Write tools (`reschedule`, `cancel`, `updateStage`, `send*`) never execute on the first call. The agent
  emits a **proposed** `McpAction` (tool name + args + a human-readable diff); it renders as `McpActionCard`
  in `pending` state and only runs when the owner taps "אשר ובצע" (or edits then approves). `approval.ts` is
  the single chokepoint every tool server's write path must go through — do not let an individual tool
  server decide for itself that it's "safe enough" to skip approval.
- Each tool server function takes a `staffId`/`role` and enforces the same permission rules the rest of the
  app uses (e.g. a staff member without calendar-write access gets a tool error, not a silent no-op).

## 5. Approval + edit flow (state machine)

```
pending → editing → pending (cancel edit, keep original draft)
pending → executing → done
pending → cancelled
editing → executing → done      (save edits, then approve)
done → cancelled                (undo window, 5 minutes — see MCP‑09)
```

- **pending**: `McpActionCard` shows the diff (before → after) read-only, "אשר ובצע" primary + "עריכה" text
  action. Composer stays active — the owner can keep chatting while a proposal waits.
- **editing**: the *same card* swaps its diff rows for editable controls (time picker, toggles, an editable
  message-template textarea with char count and "שחזור נוסח מקורי"). The composer **locks** (dim + disabled
  placeholder) — no new message can be sent mid-edit, since the model isn't in the loop for a raw form edit.
  This is what MCP‑07/08 show. Store the in-progress edit in `draftEdits[actionId]` so navigating away and
  back (or switching mobile↔desktop mid-session) doesn't lose it.
- **executing**: brief 3-dot "בודק חלונות פנויים…" state (MCP‑06's typing-style row) while the tool call
  runs server-side.
- **done**: card locks, emerald, shows what actually happened + "ביטול הפעולה" for 5 minutes. Cancelling
  calls the inverse tool (e.g. reschedule back) and re-opens the card as a new `pending` action rather than
  mutating history.

Persist `McpAction` rows (not just chat text) so a page refresh mid-approval doesn't lose the pending state —
the chat message and the action are two related records, not one blob of text.

## 6. Placement, states, shortcuts

- Mount `McpBubble` once, in the same root chrome as `MobileBottomNav`/`Sidebar` (`dashboard/route.tsx`), so
  it survives route changes and keeps its Zustand state.
- Bubble position: `fixed`, `inset-inline-end: 18px`, `bottom: 96px` on mobile (clears the tab bar +
  safe-area), `bottom: 24px` `inset-inline-end: 24px` on desktop (clears nothing — no bottom nav there).
  `z-50`, same layer as sheets.
- Bubble states: idle (`sparkles`, primary bg, green dot = MCP connected) · working (animated 3-dot glyph,
  ring pulse) · needs-approval (red count badge) · disconnected (muted bg, grey dot) — see the "מצבי הבועה"
  swatch row in the reference file.
- Desktop popover: 420×560, anchored to the bubble, never blocks the primary nav rail.
- `⌘K` / `Ctrl+K` opens the panel directly to a fresh chat (desktop only — no keyboard shortcut affordance on
  mobile).
- Title bar = history toggle: tapping the conversation title chevrons it open/closed into `McpHistoryList` in
  the same panel (no navigation, no second sheet) — this is the one requirement from the original ask and it
  must stay a toggle, not a separate route.

## 7. Data model (PocketBase)

New collections — do not add MCP fields to the existing `conversations`/`messages` tables.

| Collection | Fields |
| --- | --- |
| `mcp_conversations` | `id`, `staff` (relation → users), `title` (auto-generated from first message, editable), `channel` (`web` \| `whatsapp`, default `web` — see §8), `created`, `updated`, `last_message_at` |
| `mcp_messages` | `id`, `conversation` (relation), `role` (`owner` \| `assistant`), `body`, `tool_calls` (json, read-tool results for rendering `McpToolCallCard`), `created` |
| `mcp_actions` | `id`, `conversation` (relation), `message` (relation → the message that proposed it), `tool_name`, `args` (json), `status` (`pending`\|`editing`\|`executing`\|`done`\|`cancelled`), `diff` (json: before/after for rendering), `executed_at`, `undo_expires_at` |

Retention: cap at 30 conversations per staff member (per the MCP‑05 footer copy "נשמרות 30 השיחות
האחרונות") — prune oldest on write, or add a scheduled cleanup job; don't grow this table unbounded.

## 8. Designing now for WhatsApp later

The ask is web-only today, but the owner may later want to run the same assistant *from their own WhatsApp*
(distinct from customers messaging the studio's WhatsApp number — this would be the owner's personal number
talking to a bot number). Build the two seams that make that additive, not a rewrite:

1. **Channel-agnostic message core.** `agent.ts` should take `{ conversationId, text, attachments }` and
   return `{ text, toolCalls, actions }` with no knowledge of *how* the message arrived. `McpPanel.tsx` (web)
   and a future `mcp-whatsapp.webhook.ts` both call the same `agent.ts` — the web UI is one channel adapter,
   a WhatsApp webhook would be a second.
2. **`channel` field on `mcp_conversations`.** Already in the schema above. A WhatsApp-originated conversation
   just writes `channel: 'whatsapp'` and has no `McpPanel` — it's rendered nowhere in-app except optionally a
   read-only log in settings.
3. **Approval must work over WhatsApp text, not just tapped buttons.** When you build the WhatsApp channel,
   `McpActionCard`'s pending/editing states need a WhatsApp equivalent: numbered quick-replies or a plain
   "reply 1 to approve, 2 to edit" — design that interaction then, but keep `approval.ts`'s state machine
   (§5) channel-agnostic now so it's the same states either way.
4. **Reuse `src/integrations/whatsapp-cloud-api/*` as the transport**, exactly as the Customer Agent does —
   but the MCP Agent's WhatsApp bot number must be a **separate WhatsApp sender identity** from the studio's
   customer-facing number. Do not route owner-assistant traffic and customer traffic through the same
   WhatsApp number; they need to be distinguishable at the transport layer, not just the app layer.

Nothing in §3–§7 needs to change to add this later if the channel field and the `agent.ts` boundary are
respected from the start.

## 9. File change map (new work — nothing above is touched)

| Path | Action |
| --- | --- |
| `src/features/mcp-assistant/server/{agent,prompts,approval}.ts` | **NEW** |
| `src/features/mcp-assistant/server/tool-servers/{calendar,leads,payments,messaging}.server.ts` | **NEW** |
| `src/features/mcp-assistant/components/{McpBubble,McpPanel,McpHistoryList,McpToolCallCard,McpActionCard}.tsx` | **NEW** |
| `src/features/mcp-assistant/hooks/useMcpConversation.ts` | **NEW** |
| `src/features/mcp-assistant/store/mcpUiStore.ts` | **NEW** |
| `src/features/mcp-assistant/types.ts` | **NEW** |
| `src/features/conversations/components/MessageBubble.tsx` | **VERIFY** — confirm it takes no conversation-specific prop that would block reuse; extract a shared composer if one doesn't already exist standalone |
| `src/routes/dashboard/route.tsx` | **CHANGE** — mount `<McpBubble/>` + `<McpPanel/>` once, in root chrome |
| PocketBase schema | **NEW** collections `mcp_conversations`, `mcp_messages`, `mcp_actions` (§7) |

## 10. Verification checklist

- [ ] MCP Agent's server code imports nothing from `src/integrations/ai/prompts.ts` or its tool files
- [ ] A prompt-injected string inside a customer WhatsApp message cannot reach any MCP write tool (test: try it)
- [ ] Every write tool call renders a `pending` `McpActionCard` and does not execute before approval
- [ ] Editing an action locks the composer; leaving and reopening the panel restores the in-progress edit
- [ ] Bubble survives client-side route navigation without remounting/losing conversation state
- [ ] Title-tap toggles history in place — no route change, no second sheet stacked on top
- [ ] Desktop popover never overlaps the sidebar or covers a card's primary action (see MCP‑08 fix)
- [ ] `mcp_conversations`/`mcp_messages`/`mcp_actions` are separate tables from `conversations`/`messages`
