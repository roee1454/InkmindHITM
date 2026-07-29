# Bot polish: tone fixes, media handling, inspiration-photo gate

## Context

Live testing of the WhatsApp agent surfaced three issues to fix:

1. **Tone**: `suggest_artists` phrases its pick as "I found you an artist" (מצאתי לך אמן), which
   reads as if the model stumbled onto a name rather than deliberately picked the best match
   from the studio's roster. Separately, the model's replies sometimes use an em-dash (—), a
   well-known AI-writing tell the studio wants to avoid entirely.
2. **Media is a black box today**: images ARE already downloaded and stored per-message
   (`messages.media` file field, via `ingestInboundMessage` in `webhook.ts`) and the model is
   already told a message contains one (`describeInboundBody`'s `[הלקוח שלח תמונה]` tag, added
   last pass) — but there's no UI to browse them, no split between "inspiration" reference shots
   and "verification" docs (receipts, parental consent), and — the sharper bug — every inbound
   image immediately triggers its own full bot turn, so a customer sending 3 photos in a row gets
   3 separate bot replies instead of one.
3. **Bookings can be created with zero reference photos today.** The studio wants that to be rare:
   `collect_tattoo_info` should push hard for at least one inspiration photo before locking a slot.

**Decisions confirmed with the user:**
- The "wait for more messages before replying" debounce applies **only to media messages** — a
  lone text message still gets an immediate reply exactly like today; only images/documents/etc.
  trigger the short wait (batching multiple photos into one bot turn). If a text message arrives
  while a media-wait is already pending, treat it as "customer is done" — collapse the wait and
  run the turn immediately (the already-persisted images are already in history by then).
- The inspiration-photo requirement is a **soft gate with an explicit, auditable override**: the
  tool refuses to create a hold unless either a real inspiration photo exists in the
  conversation, or the model explicitly passes `customerDeclinedPhotos: true` (only after asking
  the customer) — never a silent bypass. Both outcomes are recorded in `tattoo_info` for staff
  visibility.

## What changes

### 1. Tone fixes — `src/integrations/ai/prompts.ts`, `src/integrations/ai/tools.server.ts`
- `HEBREW_PERSONA_SUFFIX`: add a rule banning the em-dash (—) outright ("סימן היכר של טקסט
  שנוצר ע״י AI — השתמשו בפסיק, נקודה, או מקף רגיל במקום"), and a rule that any recommendation
  (artist, style, slot) must be phrased as the bot's own professional judgment ("אני חושב
  שרואי יתאים לך מעולה לסגנון הזה"), never as a lucky find.
- `TOOL_EXPLANATIONS.suggest_artists` and the `suggest_artists` tool's returned `message` in
  `tools.server.ts`: replace the generic "present naturally" instruction with explicit phrasing
  guidance carrying the same rule.
- `src/integrations/ai/agent.server.ts`: defense-in-depth — before sending `replyText`, strip any
  em/en-dash the model produces anyway (`replyText.replace(/[—–]/g, ',')`), since prompt
  instructions aren't 100% reliable. Belt-and-suspenders, not a replacement for the prompt rule.

### 2. Media debounce — new `src/lib/debounce-scheduler.ts`
Same shape as `async-lock.ts`'s `KeyedLock` (module-level singleton, single Node process only,
same documented limitation), but for delayed-not-mutual-exclusion scheduling:
```ts
class DebounceScheduler {
  schedule(key: string, delayMs: number, fn: () => void): void   // (re)start the timer for `key`
  cancelAndRunNow(key: string, fn: () => void): void              // drop any pending timer, run now
}
export const botTurnScheduler = new DebounceScheduler()
```
In `src/features/conversations/server/webhook.ts`'s `ingestInboundMessage`, replace the current
direct `await runBotTurn(...)` with:
```ts
const runTurn = () => runBotTurn({ su, conversationId: conversation.id, customerId: customer.id })
  .catch((err) => console.error('runBotTurn failed:', err))

if (BOT_TURN_STATUSES_APPLICABLE) {
  if (event.message.type !== 'text') botTurnScheduler.schedule(conversation.id, 6000, runTurn)
  else botTurnScheduler.cancelAndRunNow(conversation.id, runTurn)
}
```
Neither branch is awaited — this is a deliberate, positive side effect: the webhook handler stops
blocking on the full OpenAI round-trip before acking Meta, it just fires the (possibly delayed)
turn in the background. `runBotTurn` already re-checks conversation status/locks internally
(`conversationLock`), so a stale scheduled turn racing a staff takeover is already handled safely.

### 3. Inspiration vs. verification media — schema + categorization
New migration: `messages.media_category` (select, nullable: `inspiration` | `verification`).
Set at ingest time in `ingestInboundMessage` for any non-text message, based on the
conversation's `state` at receipt: `NEW`/`COLLECTING_INFO`/`AWAIT_PRICE_OFFER` → `inspiration`;
everything else (`AWAIT_PAYMENT`, `AWAIT_FINAL_CONFIRMATION`, `AWAITING_APPOINTMENT`,
`AWAIT_NPS_SCORE`, `COMPLETED`) → `verification`. This is a heuristic, not a guarantee — staff
can correct it (see below).

New `setMessageMediaCategory({messageId, category})` in
`src/features/conversations/server/messages.ts` (staff-session gated, mirrors existing patterns
in that file) for manual re-tagging.

### 4. Gallery UI — reuse `ImageGalleryDialog`, don't rebuild it
`src/features/calendar/components/ImageGalleryDialog.tsx` already exists and is a perfect fit:
controlled dialog, takes a flat `images: string[]` + `initialIndex`, no collection-specific
knowledge. The conversations 2-pane layout (`conversations.tsx` → `ConversationList` +
`ConversationThread`, plain flex row) has no room for a persistent 3rd panel, and this codebase's
existing convention for viewing image sets is a modal trigger (`EditAppointmentDialog`/
`AppointmentTable` already use `ImageGalleryDialog` this way) — matching that instead of
inventing a new persistent-panel pattern.

In `ConversationThread.tsx`: derive `inspirationImages`/`verificationImages` (URLs via the
existing `messageMediaUrl()` helper in `src/features/conversations/lib/media.ts`) with a
`useMemo` over the already-loaded `messages` data — no new query needed. Add two small header
buttons next to the existing "resume bot"/"confirm receipt" ones: "תמונות השראה (n)" /
"אסמכתות (n)", each opening `ImageGalleryDialog` with that array.

In `MessageBubble.tsx`: replace the current raw `<a target="_blank">` wrapper around inbound
images with a click handler that opens the shared gallery at the clicked image's position
(browse same-category images from any thumbnail), and add a small tappable category pill
("השראה"/"אסמכתא") on each image bubble that toggles `setMessageMediaCategory` for corrections.
Requires adding `mediaCategory` to `UIMessage`/`toUIMessage` (`src/features/conversations/types.ts`,
`server/messages.ts`).

Also update the `COLLECTING_INFO` state prompt in `prompts.ts` to acknowledge inbound images
naturally during intake (today only `AWAIT_PAYMENT` reacts to the `[הלקוח שלח תמונה]` tag) —
e.g. "אם הלקוח שלח תמונה, זו כנראה השראה לעיצוב — הודו לו/ה והתייחסו אליה בהמשך."

### 5. Inspiration-photo gate — `collect_tattoo_info` in `tools.server.ts`
```ts
inputSchema: z.object({
  designDescription, placementSpot, staffId, date, timeSlot, durationHours,
  customerDeclinedPhotos: z.boolean().default(false)
    .describe('true רק אם נשאל במפורש ואין לו/מסרב לשלוח תמונה'),
}),
execute: async ({ ..., customerDeclinedPhotos }) => {
  if (!customerDeclinedPhotos) {
    const hasPhoto = await su.collection('messages').getList(1, 1, {
      filter: `conversation = "${conversationId}" && direction = "inbound" && type = "image"`,
    }).then(r => r.totalItems > 0)
    if (!hasPhoto) {
      return { status: 'error', message: 'אין עדיין תמונת השראה. בקשו מהלקוח לשלוח תמונה, או אם הוא מסרב — קראו שוב לכלי עם customerDeclinedPhotos: true.' }
    }
  }
  // ...existing hold-creation logic unchanged, plus store hasInspirationPhoto/customerDeclinedPhotos in tattoo_info
}
```
Update the `COLLECTING_INFO` state prompt to instruct always requesting a reference photo before
the final-summary/confirmation step, and to use `customerDeclinedPhotos: true` explicitly (never
silently) if the customer has none.

## Files touched
- `src/integrations/ai/prompts.ts` — persona rules, COLLECTING_INFO prompt, tool explanation text
- `src/integrations/ai/tools.server.ts` — `suggest_artists` phrasing, `collect_tattoo_info` gate
- `src/integrations/ai/agent.server.ts` — em-dash sanitizer before send
- `src/lib/debounce-scheduler.ts` — new
- `src/features/conversations/server/webhook.ts` — debounced/immediate scheduling, media_category tagging
- `src/features/conversations/server/messages.ts` — `setMessageMediaCategory`, `toUIMessage` field
- `src/features/conversations/types.ts` — `UIMessage.mediaCategory`
- `src/features/conversations/components/ConversationThread.tsx` — gallery buttons + derived arrays
- `src/features/conversations/components/MessageBubble.tsx` — click-to-gallery, re-tag pill
- New migration: `messages.media_category` select field

## Verification
1. `tsc --noEmit` / `pnpm lint` clean.
2. Send 3 test images in a row via a real webhook simulation to a `bot_active` conversation —
   confirm only ONE bot reply lands (after ~6s), not three; confirm a lone text message still
   replies immediately with no added delay.
3. Confirm `media_category` gets set correctly for an image sent during `COLLECTING_INFO` vs one
   sent during `AWAIT_PAYMENT`; confirm the re-tag pill in the UI flips it and persists.
4. Confirm the two gallery buttons in `ConversationThread` show correct counts and open
   `ImageGalleryDialog` at the right starting image.
5. Confirm `collect_tattoo_info` refuses (with a steering message) when no inspiration image
   exists and `customerDeclinedPhotos` is unset/false; confirm it succeeds when
   `customerDeclinedPhotos: true` is passed, and that `tattoo_info` records which path was taken.
6. Manually re-check a live bot reply for em-dash usage and artist-recommendation phrasing.


## Context

The foundation layer (Vercel AI SDK + OpenAI provider, model-capability handling, settings CRUD,
a manual "test connection" button) is already built and verified
(`src/integrations/ai/capabilities.ts`, `client.server.ts`, `src/features/settings/server/ai.ts`).
Nothing yet makes the AI actually reply to a real customer — `ingestInboundMessage` in
`src/features/conversations/server/webhook.ts` always creates new conversations with
`status: 'staff_handling'`, and there is no tool-calling loop, no bot-side appointment/FAQ
access, and no outbound send path with `sender_type: 'ai_bot'`.

The Pocketbase schema already anticipated this: `conversations.status` includes `'bot_active'`,
`messages.sender_type` includes `'ai_bot'`, `appointments.source` includes `'ai_bot'`, and a
`faq` collection plus `policy` settings (cancellation cutoff, payment instructions, review link)
already exist. This pass wires those already-reserved schema slots up to a working, scoped-down
version of the WAHA prototype's 13-tool booking agent, using the Vercel AI SDK's `tool()` +
multi-step `generateText` abstraction instead of a hand-rolled function-calling loop (`ai@7.0.34`
/ `@ai-sdk/openai@4.0.17` — v5-generation API: `tool({ inputSchema, execute })`,
`stopWhen: stepCountIs(n)`, not the older `parameters`/`maxSteps` names).

**User decisions locked in for this pass:**
- History sent to the model each turn = full replay of the conversation's `messages`, bounded/
  truncated for token safety (recency window + tool-payload shrinking for older turns) — not a
  separate "state summary" mechanism. Simpler and matches WAHA's validated approach.
- Every new conversation starts as `bot_active` whenever `ai_enabled` is on (no business-hours
  or other gating) — conversations only leave `bot_active` when the bot itself calls
  `call_staff`.
- A conversation that has been escalated to staff can be handed back to the bot mid-thread by a
  staff action, so bot context must be able to include prior staff-authored messages without the
  model claiming authorship of them (narrate them as `[Staff]: ...` lines in a `user`-role
  message, not `assistant`-role).

## Scope for this slice

**6 tools**, not all 13 from the WAHA prototype:
1. `check_availability` — read-only slot check for a staff member/date/duration.
2. `get_artist_schedule` — read-only upcoming-bookings list for an artist.
3. `collect_tattoo_info` — creates an idempotent **pending** appointment hold
   (`status: 'pending'`, `source: 'ai_bot'`); re-validates the slot server-side, never trusts the
   model's own prior `check_availability` call.
4. `answer_faq` — hands the model the full `faq` list to semantically match (collection already
   exists, no schema change).
5. `call_staff` — generic handoff: `conversations.status = 'escalated'`, `is_staff_called = true`,
   `staff_call_reason`, pushes a system notification.
6. `save_client_name` — updates `customers.name`.

**Deferred to a later pass** (explicitly out of scope): `suggest_artists`, `wait_for_payment`,
`request_reschedule`, `request_cancel`, `record_nps_score`, `send_message` (mid-turn bubble);
the `STATE_TOOLS` state-gating map keyed off `conversations.state` (all 6 tools are exposed
unconditionally this pass; `state` stays reserved/unused); turning a `pending` hold into
`confirmed` (still only via the existing staff UI); `streamText` streaming; media-aware tool
calls; rate limiting/cost caps.

## What changes

### 1. `src/features/calendar/server/bot-appointments.server.ts` (new)
Superuser-context equivalents of the `requireAuth()`-gated functions in
`src/features/calendar/server/appointments.ts` — a webhook-triggered bot call has no staff
session, so it cannot call those directly.
- `checkAvailabilityForBot({staffId, date, timeSlot, durationHours})`
- `getArtistScheduleForBot({staffId, fromDate, days})`
- `createPendingHoldForBot({customerId, staffId, date, timeSlot, durationHours,
  tattooDescription})` — re-validates the slot, checks for an existing pending `ai_bot`-sourced
  hold for this customer before creating a duplicate, creates with `status: 'pending'`,
  `source: 'ai_bot'`, then calls the existing `syncAppointmentToGoogle(id)`.

Refactor `src/features/settings/server/profiles.ts`'s `getWorkingHours` so the `work_hours` JSON
parsing logic is a shared non-gated helper both the existing staff-facing fn and the new bot
path call — pure extraction, no behavior change, avoids duplicating slot-validation logic.

### 2. `src/integrations/ai/tools.server.ts` (new)
Vercel AI SDK `tool()` definitions for all 6 tools, built per-invocation via a factory closured
over `{su, conversationId, customerId}` (mirrors the existing `createWhatsAppClient(creds)`
factory pattern). Every tool result is `{status, message, data?}` where `message` is phrased as
an instruction to the model for its next turn (carried over from WAHA's validated pattern), e.g.
`answer_faq`'s execute just does `su.collection('faq').getFullList()` inline (no separate file —
the read path is too small to warrant one). `call_staff`'s execute sets the conversation fields
directly and calls `addSystemNotification` (existing, from
`src/features/notifications/server/notifications.ts`). `save_client_name`'s execute is a one-line
`su.collection('customers').update(...)`.

### 3. `src/integrations/ai/agent.server.ts` (new) — orchestration core
```ts
export async function runBotTurn({ su, conversationId, customerId }): Promise<void>
```
- Loads AI settings (superuser, same fields as `getAiSettings` but no `requireAuth()`).
- Builds history: last N `messages` for the conversation, mapped to AI SDK `ModelMessage[]`:
  `direction:'inbound'` → `role:'user'`; `direction:'outbound' && sender_type:'ai_bot'` →
  `role:'assistant'`; `direction:'outbound' && sender_type:'staff'` → `role:'user'` narrated as
  `[Staff]: <body>` (per the locked-in decision above). Apply WAHA-style truncation: shrink old
  tool-result payloads, cap total messages sent.
- Calls `generateText({ model: openai(model), system: systemInstructions, messages: history,
  tools: buildBotTools({su, conversationId, customerId}), stopWhen: stepCountIs(5),
  ...buildGenerationParams(model, {temperature, maxTokens}) })` — imports `buildGenerationParams`
  directly from `capabilities.ts` (bypasses `generateAiReply`, which is single-shot/no-tools;
  that function stays untouched, still used by the settings "test connection" button).
- If `result.text` is non-empty, sends it via `createWhatsAppClient(...).sendText(...)` and
  persists an outbound `messages` row (`sender_type:'ai_bot'`, `status:'sent'`). A turn that only
  calls `call_staff` may produce no user-facing text — that's fine, nothing is sent.
- Updates `conversations.last_message_at`.
- Wraps the whole call in try/catch: on any failure (OpenAI error, etc.), falls back to the same
  escalation path `call_staff` uses (`status:'escalated'`, notify staff) so a broken AI call
  never silently drops a customer message.

### 4. `src/features/conversations/server/webhook.ts` (modify)
- `findOrCreateConversation`: creation status becomes `ai_enabled ? 'bot_active' :
  'staff_handling'` instead of the current hardcoded `'staff_handling'` — needs the AI-enabled
  flag available at creation time (read via the same settings record already fetched for
  `getWhatsAppSettings`, or a small shared `isAiEnabled(su)` helper).
- After the inbound `messages.create()` and conversation timestamp update succeed (kept outside
  the dedup try/catch so a duplicate webhook delivery doesn't re-trigger the bot), add: if
  `conversation.status === 'bot_active'`, call `runBotTurn({su, conversationId, customerId})`
  and catch/log any escape (the function's own internal try/catch already handles escalation,
  this is a last-resort guard so the webhook handler itself never throws).

### 5. Staff hand-back-to-bot (supports the "can return to bot_active" decision)
Find wherever staff currently resolve/close an escalation in the Conversations UI (or add a
small action if none exists) and allow setting `conversations.status` back to `'bot_active'` —
scope this to whatever minimal UI hook already exists for conversation status changes; don't
build a new status-management surface if one already exists for `escalated`→other transitions.

## Verification

1. `tsc --noEmit` and `pnpm lint` clean on all new/changed files.
2. Unit tests (new `*.test.ts` files, following the `-` prefix convention for files under
   `src/routes/api/` if any land there): `createPendingHoldForBot` idempotency (two calls same
   slot → one appointment row), `runBotTurn`'s history-mapping (staff message → narrated `user`
   role, not `assistant`).
3. Toggle `ai_enabled` on in Settings → AI tab, ensure a real `OPENAI_API_KEY` is set, simulate an
   inbound webhook POST for a fresh customer (reuse the existing test-payload pattern from
   `src/routes/api/-whatsapp-webhook.test.ts` / the WhatsApp skill fixtures) — confirm: new
   conversation created as `bot_active`, `runBotTurn` fires, a tool executes (e.g. `answer_faq`),
   an outbound `messages` row lands with `sender_type:'ai_bot'`.
4. Confirm `call_staff` path: trigger a message that should escalate, verify
   `conversations.status → 'escalated'`, `is_staff_called: true`, and a notification appears.
5. Confirm `collect_tattoo_info` idempotency live: two rapid messages requesting the same slot →
   only one `pending`/`ai_bot` appointment, `syncAppointmentToGoogle` fired once.
6. Confirm the staff hand-back path flips `status` back to `bot_active` and the next inbound
   message is handled by the bot again, with the staff's interim message visible to the model as
   `[Staff]: ...` context (not claimed as the bot's own words).
7. Confirm reasoning-model composition: temporarily set `ai_model` to `gpt-5`/`o3-mini`, run a
   turn with tool calls, confirm no `temperature`-related 400 from OpenAI.
