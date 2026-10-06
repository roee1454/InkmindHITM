# Inkmind CRM

Single-tenant tattoo studio booking automation and CRM. Manages customer communication via WhatsApp Cloud API, AI-assisted appointment booking (Human-In-The-Loop), Google Calendar sync, and studio management.

## Tech Stack
- **Framework**: TanStack Start (React 19, Vite, Nitro server)
- **Database & Auth**: PocketBase (SQLite + Auth + File storage, treated as an external service)
- **AI Engine**: Vercel AI SDK (`ai` package) with Anthropic Claude Sonnet 5
- **Integrations**: Meta WhatsApp Cloud API, Google Calendar API (OAuth 2.0), Groq Whisper (voice notes)
- **Styling**: Tailwind CSS v4, Radix UI / Shadcn primitives

## Everyday Commands
- `pnpm dev` — Start dev server on port 3101
- `pnpm test` — Run unit tests (Vitest; never touches a real PocketBase)
- `pnpm tsc --noEmit` — Run TypeScript type checking
- `pnpm db:reset` — Reset local PocketBase database with seeds
- `pnpm test:integration` — Integration tests against a throwaway PocketBase (schema from `pb_migrations`, rules from `pb_hooks`)
- `pnpm db:audit` — Read-only integrity report (dangling relations, future-dated records) for the PocketBase in `.env`

## Direct Disk Write Protocol
To prevent IDE diff review queue drops, buffer desyncs, or premature rejects:
All code changes and file updates should be applied directly to the filesystem on disk (Direct Disk Write via terminal commands / scripts) rather than relying on pending interactive diff review buffers.
Changes are immediately permanent, fully inspectable via Git, and verified through automated test suites (
> inkmind-crm@ test /home/roee/Projects/InkmindHITM
> vitest run


 RUN  v4.1.10 /home/roee/Projects/InkmindHITM

 ✓ tests/routes/api/internal.lifecycle-tick.test.ts (4 tests) 166ms
stdout | tests/features/calendar/server/bot-appointments.test.ts
◇ injected env (26) from .env // tip: ◈ encrypted .env [www.dotenvx.com]

 ✓ tests/features/mcp-assistant/server/tool-servers/staff.server.test.ts (5 tests) 191ms
 ✓ tests/features/mcp-assistant/server/tool-servers/leads.server.test.ts (4 tests) 314ms
 ✓ tests/features/mcp-assistant/server/tool-servers/analytics.server.test.ts (2 tests) 203ms
 ✓ tests/features/mcp-assistant/server/tool-servers/customers.server.test.ts (3 tests) 188ms
 ✓ tests/routes/api/internal.appointment-sync.test.ts (7 tests) 230ms
stdout | tests/integrations/ai/tools/cluster3-security.test.ts
◇ injected env (26) from .env // tip: ⌘ override existing { override: true }

 ✓ tests/features/mcp-assistant/server/tool-servers/waitlist.server.test.ts (7 tests) 304ms
stdout | tests/features/conversations/server/cluster6-state-machine-sync.test.ts
◇ injected env (26) from .env // tip: ⌘ enable debugging { debug: true }

stdout | tests/features/calendar/server/cluster5-calendar-policy.test.ts
◇ injected env (26) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }

 ✓ tests/integrations/whatsapp-cloud-api/whatsapp-cloud-api.test.ts (11 tests) 90ms
 ✓ tests/lib/async-lock.test.ts (4 tests) 132ms
stdout | tests/features/calendar/server/calendar-rbac.test.ts
◇ injected env (26) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }

 ✓ tests/features/mcp-assistant/server/tool-servers/calendar.server.test.ts (8 tests) 633ms
 ✓ tests/features/analytics/server/analytics.test.ts (2 tests) 114ms
 ✓ tests/features/mcp-assistant/server/approval.test.ts (2 tests) 736ms
 ✓ tests/features/mcp-assistant/server/waitlist-matcher.test.ts (10 tests) 764ms
 ✓ tests/features/conversations/server/webhook-notifications.test.ts (1 test) 992ms
     ✓ dispatches addSystemNotification when a customer sends an inbound message  990ms
 ✓ tests/integrations/google-calendar/server/google-sync.test.ts (10 tests) 60ms
 ✓ tests/integrations/ai/prompts.test.ts (56 tests) 65ms
 ✓ tests/features/conversations/utils/format.test.ts (24 tests) 49ms
stdout | tests/features/conversations/server/cluster6-state-machine-sync.test.ts > Cluster 6: State Machine & Lead Stage Sync > TRANSITIONS and stateToLeadStage > transition() synchronizes customer.lead_stage automatically (Bug 43)
[state-machine] NEW → WANTS_TO_BOOK (bot: start_booking) conversation=conv1

stdout | tests/features/conversations/server/cluster6-state-machine-sync.test.ts > Cluster 6: State Machine & Lead Stage Sync > TRANSITIONS and stateToLeadStage > transition() synchronizes customer.lead_stage automatically (Bug 43)
[state-machine] WANTS_TO_BOOK → COLLECTING_INFO (bot: route_chosen) conversation=conv1

stdout | tests/features/conversations/server/cluster7-whatsapp-media.test.ts
◇ injected env (26) from .env // tip: ⌘ enable debugging { debug: true }

 ✓ tests/features/calendar/server/bot-appointments.test.ts (6 tests) 163ms
 ✓ tests/integrations/ai/tools/cluster3-security.test.ts (7 tests) 178ms
 ✓ tests/features/calendar/server/cluster5-calendar-policy.test.ts (12 tests) 203ms
stdout | tests/features/conversations/server/cluster6-state-machine-sync.test.ts > Cluster 6: State Machine & Lead Stage Sync > Lifecycle Nudge (20 Hours) and Stalled Lead Expiry (7 Days) > processExpiredLeads expires leads inactive for 7 days with no future appointments
[state-machine] COLLECTING_INFO → COMPLETED (system: lead_inactivity_expiry_7d) conversation=conv_exp

 ✓ tests/features/conversations/server/cluster6-state-machine-sync.test.ts (13 tests) 171ms
 ✓ tests/routes/api/whatsapp-webhook.test.ts (9 tests) 55ms
 ✓ tests/integrations/audio/server/groq-whisper.test.ts (3 tests) 70ms
 ✓ tests/routes/api/staff-google-calendar-connect.test.ts (4 tests) 52ms
 ✓ tests/lib/timezone.test.ts (3 tests) 68ms
 ✓ tests/features/notifications/notification-helpers.test.ts (6 tests) 29ms
 ✓ tests/features/settings/ai/closure-sorting.test.ts (4 tests) 17ms
 ✓ tests/features/calendar/appointment-status.test.ts (5 tests) 29ms
stdout | tests/features/conversations/server/state-machine.test.ts > transition() > applies a legal transition with extra fields in one update
[state-machine] COLLECTING_INFO → AWAIT_PRICE_OFFER (bot: test) conversation=conv1

 ✓ tests/integrations/ai/tools/datetime.server.test.ts (22 tests) 32ms
stdout | tests/features/conversations/server/state-machine.test.ts > transition() > treats an unknown stored state as NEW (matches the agent fallback)
[state-machine] NEW → COLLECTING_INFO (system: test) conversation=conv1

stdout | tests/features/conversations/server/state-machine.test.ts > transition() > syncs customer lead_stage on transition
[state-machine] NEW → WANTS_TO_BOOK (bot: start_booking) conversation=conv1

 ✓ tests/features/analytics/utils/attribution.test.ts (18 tests) 11ms
 ✓ tests/features/conversations/conversations-redesign.test.ts (26 tests) 27ms
stdout | tests/features/conversations/server/state-machine.test.ts > transition() > allows AWAIT_FINAL_CONFIRMATION to transition to AWAIT_PAYMENT and AWAIT_PRICE_OFFER
[state-machine] AWAIT_FINAL_CONFIRMATION → AWAIT_PAYMENT (staff: reopen_payment) conversation=conv1

stdout | tests/features/conversations/server/state-machine.test.ts > transition() > allows staff override from AWAITING_APPOINTMENT to AWAIT_PAYMENT without throwing
[state-machine] AWAITING_APPOINTMENT → AWAIT_PAYMENT (staff: staff_quote_adjustment) conversation=conv1

 ✓ tests/features/conversations/server/state-machine.test.ts (9 tests) 18ms
stdout | tests/features/lifecycle/server/lifecycle-service.test.ts
◇ injected env (26) from .env // tip: ⌘ override existing { override: true }

stdout | tests/features/health-declaration/server/health-declaration.test.ts
◇ injected env (26) from .env // tip: ⌁ auth for agents [www.vestauth.com]

stdout | tests/features/conversations/server/returning-customer-flow.test.ts
◇ injected env (26) from .env // tip: ⌘ override existing { override: true }

 ✓ tests/features/lifecycle/server/lifecycle-service.test.ts (12 tests) 19ms
 ✓ tests/lib/phone.test.ts (17 tests) 10ms
stdout | tests/lib/debounce-scheduler.test.ts
◇ injected env (26) from .env // tip: ⌘ suppress logs { quiet: true }

stdout | tests/features/settings/team/team-tab.test.ts
◇ injected env (26) from .env // tip: ◈ encrypted .env [www.dotenvx.com]

stdout | tests/features/settings/ai/ai-tab.test.ts
◇ injected env (26) from .env // tip: ⌘ override existing { override: true }

 ✓ tests/features/calendar/server/calendar-rbac.test.ts (3 tests) 138ms
 ✓ tests/features/conversations/server/cluster7-whatsapp-media.test.ts (21 tests) 115ms
 ✓ tests/features/mcp-assistant/server/cluster8.test.ts (10 tests) 43ms
 ✓ tests/features/calendar/server/sketch-consultation.test.ts (7 tests) 40ms
stdout | tests/features/health-declaration/server/health-declaration.test.ts > Health Declaration Integration > processHealthDeclaration Workflow & 24h Window > Branch A: when 24h window is OPEN, sends free-form WhatsApp text (0 ₪) and transitions state
[state-machine] AWAIT_HEALTH_NOTICE → AWAIT_PAYMENT (system: google_form_health_declaration_submitted) conversation=conv_1

stdout | tests/features/health-declaration/server/health-declaration.test.ts > Health Declaration Integration > processHealthDeclaration Workflow & 24h Window > Branch B: when 24h window is CLOSED, avoids 131047 error and creates staff alert
[state-machine] AWAIT_HEALTH_NOTICE → AWAIT_PAYMENT (system: google_form_health_declaration_submitted) conversation=conv_2

stdout | tests/features/health-declaration/server/health-declaration.test.ts > Health Declaration Integration > processHealthDeclaration Workflow & 24h Window > processes Hebrew Google Form submission end-to-end, updates medical notes, transitions to AWAIT_PAYMENT and sends WhatsApp
[state-machine] AWAIT_HEALTH_NOTICE → AWAIT_PAYMENT (system: google_form_health_declaration_submitted) conversation=conv_google

stdout | tests/features/health-declaration/server/health-declaration.test.ts > Health Declaration Integration > processHealthDeclaration Workflow & 24h Window > processes free sketch submission by confirming appointment and transitioning directly to AWAITING_APPOINTMENT
[state-machine] AWAIT_HEALTH_NOTICE → AWAITING_APPOINTMENT (system: google_form_health_declaration_submitted_free_sketch_confirmed) conversation=conv_free

 ✓ tests/features/health-declaration/utils/health-alerts.test.ts (7 tests) 18ms
 ✓ tests/features/health-declaration/server/health-declaration.test.ts (18 tests) 35ms
 ✓ tests/features/settings/team/team-tab.test.ts (14 tests) 15ms
 ✓ tests/hooks/useDebounce.test.ts (3 tests) 13ms
stdout | tests/integrations/ai/agent-history.test.ts
◇ injected env (26) from .env // tip: ⌘ override existing { override: true }

 ✓ tests/features/settings/ai/ai-tab.test.ts (10 tests) 16ms
 ✓ tests/features/conversations/server/health-declaration-actions.test.ts (4 tests) 20ms
 ✓ tests/features/conversations/server/realtime-and-notifications.test.ts (2 tests) 17ms
 ✓ tests/lib/sanitization.test.ts (10 tests) 22ms
 ✓ tests/features/onboarding/onboardingUiStore.test.ts (9 tests) 14ms
stdout | tests/features/conversations/server/returning-customer-flow.test.ts > Returning Customer Architecture & Health Validity > processPastConfirmedAppointments in Lifecycle Service > auto-completes confirmed appointments older than 24 hours and transitions conversation
[state-machine] AWAITING_APPOINTMENT → COMPLETED (system: tattoo_appointment_completed_auto_advance) conversation=conv_1

 ✓ tests/features/conversations/server/returning-customer-flow.test.ts (12 tests) 15ms
 ✓ tests/features/invite/inviteUiStore.test.ts (10 tests) 11ms
 ✓ tests/features/calendar/date-utils.test.ts (4 tests) 8ms
stdout | tests/features/calendar/server/multi-appointment-scoping.test.ts
◇ injected env (26) from .env // tip: ⌘ suppress logs { quiet: true }

 ✓ tests/features/settings/general/general-tab.test.ts (5 tests) 14ms
stdout | tests/features/settings/system/system-tab.test.ts
◇ injected env (26) from .env // tip: ◈ secrets for agents [www.dotenvx.com]

 ✓ tests/features/conversations/server/resume-bot.test.ts (5 tests) 20ms
 ✓ tests/integrations/ai/model/generation-params.test.ts (6 tests) 7ms
 ✓ tests/features/mcp-assistant/server/prompts.test.ts (5 tests) 11ms
 ✓ tests/integrations/ai/agent-history.test.ts (29 tests) 23ms
 ✓ tests/features/onboarding/onboarding-steps.test.ts (3 tests) 7ms
 ✓ tests/features/analytics/utils/styles.test.ts (8 tests) 9ms
 ✓ tests/lib/debounce-scheduler.test.ts (5 tests) 12ms
 ✓ tests/features/settings/system/system-tab.test.ts (9 tests) 9ms
 ✓ tests/lib/time-intervals.test.ts (4 tests) 10ms
 ✓ tests/lib/server-urls.test.ts (4 tests) 5ms
stdout | tests/features/calendar/server/calendar-disconnect.test.ts
◇ injected env (26) from .env // tip: ⌁ auth for agents [www.vestauth.com]

 ✓ tests/lib/working-hours.test.ts (5 tests) 4ms
stdout | tests/features/mcp-assistant/server/tool-registration.test.ts
◇ injected env (26) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }

 ✓ tests/features/calendar/server/multi-appointment-scoping.test.ts (2 tests) 7ms
stdout | tests/features/onboarding/onboarding-validations.test.ts
◇ injected env (26) from .env // tip: ⌘ multiple files { path: ['.env.local', '.env'] }

 ✓ tests/features/calendar/server/calendar-disconnect.test.ts (3 tests) 7ms
 ✓ tests/components/pagination.test.ts (5 tests) 16ms
 ✓ tests/components/search-input.test.ts (4 tests) 9ms
 ✓ tests/features/settings/navigation.test.ts (3 tests) 4ms
 ✓ tests/features/onboarding/onboarding-validations.test.ts (7 tests) 5ms
 ✓ tests/features/mcp-assistant/server/tool-registration.test.ts (27 tests) 5ms

 Test Files  69 passed (69)
      Tests  619 passed (619)
   Start at  19:56:55
   Duration  4.56s (transform 7.27s, setup 0ms, import 29.36s, tests 7.11s, environment 10ms), ).

## Engineering & Design Standards
Before making modifications, read the matching standard in `docs/`:
- **[docs/architecture.md](docs/architecture.md)** — Feature-sliced layout, thin routes (<=50 LOC), server/client isolation (`.server.ts`), and single-tenant rules.
- **[docs/design-system.md](docs/design-system.md)** — RTL-first UI (Hebrew), dark studio aesthetic, Shadcn UI components, and complete states (loading skeletons, empty, error).
- **[docs/code-principles.md](docs/code-principles.md)** — Single Responsibility Principle (SRP), component size limit (<=250 LOC), pure deterministic algorithms for domain math.
- **[docs/typescript-standards.md](docs/typescript-standards.md)** — Strict TypeScript (zero `any`), type inference, Zod at all boundaries, discriminated unions.
- **[docs/styling-and-css.md](docs/styling-and-css.md)** — Tailwind utility-first, logical spacing (`ms-`/`me-`), `cn()` helper, and semantic theme tokens (no magic colors).

## Full-Spectrum Implementation Rule
For every bug fix, feature, or architectural change, planning and execution MUST explicitly cover and detail all 4 dimensions without exception:
1. **Client & UX**:
   - In-CRM UI/UX: visual indicators, sync badges, toasts, dialogs, loading/empty/error states, and responsiveness.
   - End-customer WhatsApp Agent UX: message phrasing, conversational flow, transparency, and artist privacy.
   - **Screenshot & Visual Verification**: Whenever a task or plan introduces or modifies In-CRM UI/UX components (views, cards, dialogs, sheets, forms, settings), a screenshot of the new or changed UI MUST be captured upon completing execution and embedded into `walkthrough.md` for user verification.
2. **Business Logic & Server**:
   - Validations, pure algorithms, concurrency & race prevention (locks/mutexes), edge cases, and graceful fallbacks.
3. **Database & Schema**:
   - New/modified fields, PocketBase collections, indexes, and TypeScript/Zod schemas.
4. **User External Actions**:
   - Required manual setups in external consoles (Google Cloud Console, Meta WhatsApp Cloud API, Groq, `.env` environment variables).

## Superseded Logic Rule
New logic usually makes some old logic obsolete. Removing that old logic is part of the task, not a cleanup the developer does by hand after the plan ends.
1. **In the plan**: every item has a **Removes** entry that names what it supersedes: functions, components, hooks, server functions, fields, flags, constants, labels, prompt text, bot/MCP tools, tests, mocks and docs. Write "nothing" only after searching for it.
2. **In the same change**: when new logic replaces old logic, delete the old logic in the same commit.
   - Find every caller (`grep -rw <name> src tests pocketbase scripts`). If nothing calls it any more, delete it together with its tests, mocks, types, labels and doc references.
   - Don't comment code out, keep a branch "just in case", or keep unused parameters and compatibility re-exports. This is a single-tenant app with no external consumers, and git history is the backup.
   - Delete tests that only covered removed behavior. Don't skip them.
   - Interim code that a later plan item replaces gets a comment naming that item, so the item's author finds it.
3. **When it can't go yet** (live readers still depend on it, or stored data needs a migration first): record it in the plan's cleanup phase. Say who still reads it and what condition unblocks the removal.
4. **Before calling a stage done**: check the touched modules for exports that lost their last caller. `tsc` catches unused locals and parameters, not unused exports. List what was removed in the stage report.

## UI/UX Screenshot & Visual Verification Rule
Whenever work involves changes to In-CRM UI/UX (new components, dialogs, cards, sheets, views, settings, or modified visual states):
1. **Dev Server Lifecycle Protocol**:
   - **Start Dev Server**: Start the TanStack Start dev server (`pnpm dev` on port 3101) in the background before launching the browser.
   - **PocketBase Notice**: Do NOT start PocketBase (the developer manages and runs PocketBase externally).
   - **Mandatory Server Shutdown**: Once screenshots are captured, you MUST immediately terminate / kill the dev server process. Leaving orphan dev server processes running is strictly forbidden.
2. **Optional Built-in Browser Subagent Execution (DO ONLY WHEN TOLD TO!!!)**: After completing code implementation and automated tests, you **MUST** use the built-in browser subagent (`/browser` / Chrome-interfaced subagent) to perform the visual verification. Use it to navigate the live application, interact with specific components (open sheets/dialogs, click tabs, trigger states), and capture focused, high-precision screenshots of the new or changed UI.
3. **Artifact Embedding**: Save the captured image(s) into the session artifact directory and embed them directly into `walkthrough.md` (`![UI Description](/absolute/path/to/screenshot.png)`) with bullet points detailing the visual changes.
4. **Quality & RTL Audit**: Verify in the screenshot that Hebrew RTL alignment (`dir="rtl"`), typography, dark theme tokens, and component boundaries comply with `docs/design-system.md` before reporting completion.

## Deep-Dive Documentation Index
Consult these domain documents in `docs/` when working on specific subsystems:
- `docs/customer-agent-redesign/` — AI booking bot flows, state machine & edge cases
- `docs/mcp-assistant-design/` — Studio internal MCP assistant architecture
- `docs/handoffs/` — Historical session handoffs and engineering logs