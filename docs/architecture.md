# Architecture & Folder Structure

Inkmind CRM follows a **domain-oriented (Feature-Sliced)** architecture, designed to keep code modular, maintainable, and discoverable.

---

## 1. Directory Layout

```
src/
  routes/               # TanStack Router file-based routes (thin adapters <= 50 LOC)
  features/<domain>/    # Feature domains (e.g. calendar, conversations, customers, settings)
    components/         # Domain-specific UI components (<= 250 LOC per component)
    server/             # Server functions (createServerFn), services, and database queries
    hooks/              # Domain-specific React hooks
    store/              # Domain-specific Zustand UI stores (e.g. <domain>UiStore.ts)
    utils/              # Domain-specific pure utilities, helpers, formatters, and cache
    types.ts            # Domain-specific types and interfaces
    <Domain>Page.tsx    # (Optional) Domain entry page component
  components/ui/        # Shared Shadcn UI primitives only (Button, Dialog, Input, etc.)
  lib/                  # Cross-cutting, pure utilities (time-intervals, sanitization, dates)
  integrations/         # Third-party SDK clients and integrations:
    pocketbase/         # PocketBase client & superuser access
    whatsapp-cloud-api/ # Meta Cloud API client and webhook parsing
    google-calendar/    # Google OAuth2 and Calendar sync
    ai/                 # Vercel AI SDK engine, tools, prompts
```


---

## 2. Thin Routes Rule

Files under `src/routes/` must remain **thin adapters** (rarely exceeding 50 lines):
- **Responsibilities**:
  1. Validate URL params and search params (using TanStack Router `validateSearch`).
  2. Call feature server functions in `loader` if needed.
  3. Render the top-level feature page component.
- **Forbidden**: Placing heavy state management, database queries, or complex JSX structures directly inside route files. Push all logic into `src/features/<domain>/`.

---

## 3. Server vs. Client Isolation

1. **`.server.ts` Convention**: Any module that touches environment secrets (`PB_SUPERUSER_*`, `WHATSAPP_*`, `ANTHROPIC_*`, `GOOGLE_*`) or server-only libraries must use the `.server.ts` suffix. The framework guarantees at build time that these files are never bundled into the client.
2. **`createServerFn` vs Server File Routes (`server.handlers`)**:
   - Use `createServerFn` (from `@tanstack/react-start`) for all internal application data fetching and mutations triggered from the UI.
   - Use server file routes (`server.handlers` with `GET`/`POST`) **only** when responding to external third-party consumers:
     - WhatsApp webhook (`/api/whatsapp-webhook`)
     - Google OAuth callback (`/api/google-calendar/oauth/callback`)
     - Google OAuth connect redirect (`/api/staff/$staffId/google-calendar/connect`)

---

## 4. Single-Tenant Isolation

- One deployment represents one studio.
- There is **no `studios` table** and no `studio_id` column.
- Global studio configuration lives in a single `settings` record. App code must treat `settings` as a singleton.

---

## 5. PocketBase Access Pattern

- Client components must **never** instantiate a privileged PocketBase client.
- In server functions:
  - User-scoped queries use `createRequestClient(cookieHeader)` to inherit session permissions.
  - Privileged / system-level queries use `getSuperuserClient()` from `@/integrations/pocketbase/superuser.server`.

---

## 6. Feature File Placement & Loose Files Rule

Inside `src/features/<domain>/`, files are strictly organized into subdirectories:
- `components/`: UI components (<= 250 LOC per component).
- `server/`: Server functions (`createServerFn`), server services, and queries.
- `hooks/`: Domain-specific React hooks.
- `store/`: Domain-specific Zustand UI store.
- `utils/`: Domain-specific pure utilities, helpers, formatters, and cache.
- **Permitted root-level files**: ONLY `types.ts` and optionally the main page container component (e.g. `<Domain>Page.tsx`). All other loose files are strictly forbidden at the root of a feature directory and must be placed in `utils/`.

---

## 7. Integrations Directory — No God Files

Unlike `features/<domain>/`, `integrations/<name>/` has no folder-name straitjacket — which is exactly how `integrations/ai/` grew past 3000 lines across a handful of files before being split. When an integration grows past a couple hundred lines, split along these seams instead of letting one file absorb everything:

- **Pure, deterministic logic** (no PocketBase/network calls) gets its own file with no `.server.ts` suffix — e.g. a parsing engine, a history-builder, a text formatter. These are the files that can actually reach the 100% unit-test coverage `docs/code-principles.md` rule 3 asks for, but only if they aren't entangled with I/O.
- **Orchestration/I/O** (PocketBase writes, the actual LLM/API call, sends) keeps the `.server.ts` suffix and stays separate from the pure logic it calls into.
- **Static text/config data** (prompt templates, lookup tables) is its own file too, not interleaved with the functions that assemble it.
- A **thin AI-callable tool wrapper** around a pure engine (e.g. `resolve_date` calling a Hebrew date parser) belongs in its own small file — the engine underneath should have zero awareness that an AI tool exists.
- If a file is imported from outside its own integration by more than one or two other files, keep its public import path stable as a barrel (`export * from './engine/...'`) when splitting it internally — callers outside the integration should never need to know it got reorganized.

See `src/integrations/ai/` for the reference layout: `engine/` (orchestration + pure history/text helpers), `prompts/` (types, static text, assembly functions, each separate), `model/` (provider client, one-shot generator, generation params — named for what they actually do), `tools/<domain>/` (one file per sub-concern, e.g. `booking/availability.server.ts` vs `booking/cancellation.server.ts`).

---

## 8. Data Integrity & Deletion

PocketBase owns referential integrity. The Node server owns side effects outside the database. The UI never trusts an id it only knows from its cache.

**Relation policies live in the schema.** Every relation field is one of:

| Policy | Schema | Effect when the target is deleted |
|---|---|---|
| cascade | `cascadeDelete: true` | referencing records are deleted in the same transaction |
| nullify | optional, no cascade | PocketBase unsets the reference; the record stays |
| restrict | required, no cascade | PocketBase refuses the delete — avoid for anything the CRM deletes |

`messages.conversation`, `conversations.customer`, `appointments.customer`, `credentials.staff`, `waitlist_entries.customer` and the `mcp_*` chain cascade (`1786830040_data_integrity_cascade.js`). Staff references and `audit_log.conversation` nullify. Never delete related records by hand before deleting a parent. That was non-atomic, and one failure left half-deleted data.

**Rules a cascade flag can't express go in `pocketbase/pb_hooks/data-integrity.pb.js`**, so they hold for every caller (CRM, PocketBase admin UI, MCP tools, cascades):
- Every delete of customers/staff/appointments/conversations runs in one transaction, including the top-level record's hooks. PocketBase itself only wraps the cascade step.
- A customer with an upcoming pending/confirmed appointment can't be deleted. Cancel it first.
- The last owner can't be deleted.
- Deleting an appointment cancels its owner's waitlist entry and returns other customers' offers of that slot to `watching`. If the appointment is synced to Google, it writes an `integration_outbox` row.

Hooks reject with `BadRequestError('integrity:<code>')`. Map codes via `src/features/database/utils/integrity-codes.ts`. PocketBase capitalises the message and adds a period, so always parse, never compare strings directly.

**External side effects go through `integration_outbox`.** Hooks write the row inside the delete's transaction. `src/features/database/server/integration-outbox.server.ts` drains it right after a CRM delete, and every minute as a fallback, with backoff. Handlers must be idempotent.

**Deleting from the app**: `deleteEntity` / `getDeleteImpact` (`src/features/database/server/delete-entity.ts`) and `CascadeDeleteDialog`. The server checks permissions (owner/admin, or staff for their own appointments), stops a running bot turn, issues one `delete`, and returns a typed result (`deleted | not_found | forbidden | blocked | failed`). The preview is derived from the live schema (`utils/relation-graph.ts`), so it can't drift from what PocketBase does.

**Stale ids.** A server function given the id of a record that no longer exists throws `createStaleReferenceError(collection, message)` (`src/lib/stale-reference.ts`). It never falls back to creating a new record: a phone-number fallback once recreated a deleted customer as a duplicate. The QueryClient's global error handlers then refresh every list that can show that record (`invalidateEntityLists` in `src/lib/query-keys.ts`).

**Keeping the cache honest** (`useLiveEntityCache`, mounted in the dashboard layout):
- realtime invalidation for customers and staff (the other collections are covered by `useDashboardRealtime`)
- `useClockJumpGuard`: refetches when the wall clock jumps, or when a query claims a fetch time in the future
- `useCrossTabInvalidation`: relays "a mutation succeeded" to other open tabs

**Tests.** `pnpm test:integration` boots a throwaway PocketBase from `pb_migrations` + `pb_hooks` (`tests/integration/setup/`). Every hook rule and cascade needs a test there. Unit tests cannot reach a real PocketBase: `getSuperuserClient()` throws under Vitest unless `PB_TEST_INSTANCE=1`. `pnpm db:audit` reports dangling relations and future-dated records in the database from `.env`.

### Time

Never change the machine's clock to test time-based behaviour. Everything written while it is ahead keeps the future timestamp: PocketBase autodates, React Query fetch times, JWTs. That once froze a customer list for four days of "fresh" data. Lifecycle processors take `now` and a `dryRun` option instead. Use the "סימולציית זמן" dev card in Settings → AI, or call `runLifecycleTick(su, simulatedNow, { dryRun: true })` in tests.

---

## 9. Projects, Appointment Lifecycle & Payments

**One tattoo piece = one project.** `projects` groups every appointment for the piece: `appointments.kind` is `consultation`, `session` or `touch_up`. A session booked after a consultation joins its project; it isn't a copy. Money attaches to the project: quote, deposits, final prices.

**Invariants live in PocketBase hooks**, so they hold for every writer (calendar, bot, MCP, admin UI):

- `pb_hooks/projects.pb.js`: every customer appointment belongs to a project of the same customer. Callers that know the project pass it: "continue to tattoo", or the bot via `conversations.active_project`. Otherwise a new project is created in the same transaction. `kind` and the legacy `type` (sketch/tattoo) are kept in sync until readers move to `kind`.
- `pb_hooks/appointment-lifecycle.pb.js`: every status change is appended to `state_transitions`, and `confirmed_at` / `completed_at` / `cancelled_at` / `cancelled_by` are stamped.
  - Writers pass `statusChange(status, actor, reason)` (`src/features/calendar/utils/appointment-transitions.ts`). The hook consumes `status_actor` / `status_reason`, so attribution never goes stale.
  - Manual calendar edits are checked against `MANUAL_APPOINTMENT_TRANSITIONS`.
- `pb_hooks/payments-ledger.pb.js`:
  - A session or touch-up can't move to `completed` without `final_price > 0` or `charge_waived`.
  - The legacy `deposit_paid` flag is mirrored into `payments` (strangler pattern). Flipping it on records a verified deposit, and flipping it off voids it.

**Closing a session** (`src/features/payments/server/close-session.server.ts`): the final price and the payments taken on the spot go in one PocketBase batch, so the write is all or nothing. The project balance (`utils/balance.ts`) is billed final prices minus verified payments. Money paid ahead (a deposit for a later session) is `credit`, never a negative amount due. Past sessions are no longer auto-completed: the lifecycle tick reminds staff once ("סשן ממתין לסגירה"), and only consultations auto-complete. Aftercare therefore goes out only for sessions that were actually closed.

**Conversation after an appointment** (`src/features/conversations/server/after-appointment.server.ts`): after a finished consultation → `WANTS_TO_BOOK`, and the project stays active. After a finished session → `COMPLETED`, which clears `active_project`.

**Cancellation policy wording** lives only in `src/lib/cancellation-policy.ts`. The bot never tells a customer their deposit is forfeited. Remote bookings may be refundable under consumer-protection law, so staff decide.

Tests: `tests/integration/{projects,projects-backfill,project-booking,appointment-lifecycle,payments}.test.ts`. `projects-backfill` runs the upgrade against data created under the old schema.
