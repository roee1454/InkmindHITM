# Inkmind CRM

Single-tenant tattoo/studio booking automation and CRM — one studio per deployment. Rebuild of
the WAHA project (`/home/eviltwin/Projects/WAHA`) on a new stack, chosen specifically to fix
WAHA's problems: a monolithic always-on server, WAHA's unofficial WhatsApp bridge, a
hand-rolled tool engine, and a folder structure that grew organically instead of being
designed. Do not port architecture decisions from WAHA — only its UI components (see below)
and validated domain knowledge (booking rules, deposit flow, conversation state machine) are
worth reusing.

## Tech stack

- **TanStack Start** (React 19, file-based routing under `src/routes`) — full-stack framework:
  server functions (`createServerFn`) and server routes (`server.handlers` on a file route)
  replace the old Express app. No standalone backend process.
- **TanStack Query** for server-state caching, **TanStack Table** for data grids.
- **Shadcn UI** — components are generated via `pnpm dlx shadcn@latest add <name>` into
  `src/components/ui`, not hand-copied. Port WAHA's *bespoke* components (booking calendar,
  conversation view, etc.) by rebuilding them against this project's shadcn primitives, not by
  copy-pasting WAHA's `apps/ui/src/components` verbatim — that folder mixed shadcn primitives
  with app-specific styling.
- **Pocketbase** — single service for auth (role-based: owner/staff/admin), the database, and
  file storage (media, deposit receipts). No separate ORM/migration tool; Pocketbase collections
  are the schema. Treat Pocketbase as an external service reached over its SDK/HTTP API from
  server functions — never embed it as an in-process library.
- **Vercel AI SDK** (`ai` package) for the WhatsApp agent's tool-calling engine. This replaces
  WAHA's `tool-executor.ts`. Design tools as small, typed, single-purpose functions (book
  appointment, check availability, cancel, escalate to staff) and let the SDK's tool-calling
  loop drive multi-step conversations — don't rebuild a custom dispatch loop on top of it.
- **WhatsApp Business Platform (Cloud API)** — official Meta API, not WAHA. This means webhook
  verification (hub.challenge handshake), message templates for business-initiated messages
  outside the 24h window, and a single phone-number-ID / access-token pair (stored in the
  `settings` record) instead of a WAHA session.
- **Auth** is email + password via Pocketbase's built-in `passwordAuth` on the `staff` auth
  collection (`authWithPassword`/`authRefresh`, no OAuth). Admins set a temporary password
  when inviting staff.
- **Google Calendar sync** is implemented: a per-staff OAuth flow writes a `credentials`
  collection, and a server function `syncGoogleCalendar` reads the `credentials`, lists Google
  events for the next 30 days, and creates `CalendarSyncEvent` records (see `features/booking/server/google-sync.ts`).
  - The Google OAuth redirect (a server `handler` route) also creates an initial `StaffCalendarPreference` for the
    artist if one doesn't exist, with `syncWithGoogle = true`.
  - Don't delete the `credentials` collection or stop writing to it; this is now a production feature.
- **Render** for deployment, via the `render.yaml` Blueprint at the repo root — two always-on
  `starter` services: `inkmind-crm-web` (this app) and `inkmind-crm-pocketbase` (PocketBase,
  built from `pocketbase/Dockerfile`, with a persistent disk so its SQLite data survives
  restarts/redeploys). See `README.md` for the deploy steps.

## Single-tenant

One deployment = one studio. There is **no `studios` collection and no `studio` relation
field anywhere** — this was deliberately removed (see git history) after starting the project
multi-tenant. Concretely:

- Studio-wide config (name, timezone, currency, AI/WhatsApp/deposit policy) lives in a single
  `settings` record — there is exactly one row, ever. App code must not create a second one;
  treat `settings` as a singleton (fetch-or-404, never list-and-pick-first).
- Don't reintroduce tenant-scoping "for future flexibility" — no `studio_id` columns, no
  tenant-aware query helpers. If multi-studio support is ever needed again, that's a deliberate
  future migration, not something to hedge for now.
- `staff`, `customers`, `appointments`, `conversations`, etc. are scoped only by their own
  relations (e.g. `appointments.customer`, `appointments.staff`) — no additional tenant
  dimension to thread through.

## Folder architecture

Domain-oriented, not layer-oriented — this is the direct fix for WAHA's folder mess:

```
src/
  routes/               # TanStack Router file routes — thin: parse input, call a domain
                         # service, render. No business logic here.
  features/<domain>/    # e.g. features/booking, features/conversations, features/deposits
    server/             # server-only functions & services for this domain
    components/         # domain-specific UI (not generic — generic goes in src/components/ui)
    hooks/
    types.ts
  components/ui/        # shadcn-generated primitives only
  lib/                  # cross-cutting utilities (pocketbase client, ai-sdk tool registry glue)
  integrations/         # third-party wiring: pocketbase, whatsapp-cloud-api, google-calendar
```

A route file should rarely exceed ~50 lines of logic; anything more belongs in
`features/<domain>/server`. Don't create a `services/` or `utils/` catch-all at the root —
each domain owns its own server folder.

## Cross-cutting rules

- Package manager is **pnpm** — don't introduce npm/yarn lockfiles.
- Secrets and per-environment config go through `.env` locally and each Render service's
  Environment tab in production — never hardcoded, matching the env-var direction WAHA was
  already moving toward.
- Prefer TanStack Start server functions co-located with the route that uses them; only reach
  for a `server.handlers` API route when the consumer is an external system (WhatsApp webhook,
  Google OAuth callback) rather than this app's own UI.
- Tests via Vitest (`pnpm test`).
