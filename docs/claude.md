# Session Handoff — 2026-07-22 (Antigravity → Claude)

Written for Claude (or any agent) continuing this project. This document supersedes/extends the
handoff written on 2026-07-20 inside `AGENTS.md`. Read the 2026-07-20 entry in `AGENTS.md`
first — it describes the WhatsApp security hardening and leads-board UX fixes that formed the
foundation for the work described here.

---

## What was built since the last handoff

### 1. Google Calendar OAuth integration (fully implemented)

The calendar sync that CLAUDE.md marked as "deferred" is now **live**.

**New files:**
- `src/integrations/google-calendar/server/google-auth.ts` — OAuth2 flow using `googleapis`:
  - `packOAuthState` / `unpackOAuthState` — base64url-encoded state blob (`{ staffId, origin, ts }`)
  - `getAuthUrl(state)` — generates the consent URL with scopes `calendar.events`, `userinfo.email`, `userinfo.profile`
  - `exchangeCode(code)` — swaps the auth code for tokens and fetches user email/picture via the People API
  - `saveGoogleCredentials(staffId, tokens)` — writes to the `credentials` PocketBase collection
  - `createGoogleCalendarEvent`, `updateGoogleCalendarEvent`, `deleteGoogleCalendarEvent` — Google Calendar CRUD using per-staff stored tokens, with automatic token refresh via `getRefreshedClient(staffId)`
  - `disconnectStaffGoogleCalendar(staffId)` — deletes the credentials record and removes all synced event IDs from the staff's appointments

- `src/integrations/google-calendar/server/google-sync.ts` — orchestration layer:
  - `syncAllConfirmedAppointmentsForStaff(staffId)` — called immediately after OAuth connect; pushes all existing `confirmed` appointments for that artist to Google Calendar
  - `buildEventInput(...)` — converts a PocketBase appointment to a Google Calendar event payload (Hebrew title: `{name} — תור קעקוע`, description includes phone, tattoo description, price, duration, notes)
  - `createOrUpdateCalendarEvent`, `deleteCalendarEventIfExists` — safe sync operations for appointment create/update/delete flows

**New API route:**
- `src/routes/api/google-calendar.oauth.callback.ts` — `GET /api/google-calendar/oauth/callback`
  - Opened as a popup by the UI; on completion posts `{ type: 'google-calendar-oauth-result', success }` to `window.opener` and closes itself
  - On success: `exchangeCode` → `saveGoogleCredentials` → `syncAllConfirmedAppointmentsForStaff`

**New API route (initiates flow):**
- `src/routes/api/staff.$staffId.google-calendar.connect.ts` — `GET /api/staff/:staffId/google-calendar/connect`
  - Protected: requires auth and either the requesting staff to be the target, or admin
  - Returns a `302` redirect to the Google OAuth consent URL

**New UI:**
- `src/features/settings/components/GoogleCalendarConnection.tsx` — per-staff card showing connect/disconnect state, connected email, profile picture, token freshness, and a "Sync now" button
- `src/features/settings/components/CalendarFeedsTab.tsx` — iterates over all staff, renders one `GoogleCalendarConnection` card each; admins see all, non-admins see only themselves

**PocketBase migration:**
- `pocketbase/pb_migrations/1784563337_add_google_account_fields.js` — adds `google_account_email` and `google_account_picture` text fields to the `credentials` collection

**Required env vars** (add to `.env` and Render):
```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://your-domain/api/google-calendar/oauth/callback
```
Locally, `GOOGLE_OAUTH_REDIRECT_URI` defaults to `http://localhost:3101/api/google-calendar/oauth/callback`.

**Status:** Implemented but **not yet end-to-end tested with a live Google account** — credentials fields exist in PocketBase and the flow compiles, but the user has not yet gone through the consent screen.

---

### 2. Notifications system (fully implemented)

A real-time in-app notification center for system events.

**PocketBase:**
- `pocketbase/pb_migrations/1784564200_seen_and_notifications.js`:
  - Creates a new `notifications` collection (`id`, `title`, `message`, `type` select enum, `read` bool, `link` optional text, `created` autodate)
  - Adds a `seen` boolean field to the `messages` collection (used by the conversation unread count logic)

**Server functions** — `src/features/notifications/server/notifications.ts`:
- `getNotifications()` — returns all notifications sorted by `-created`
- `getUnreadNotificationsCount()` — returns count of unread; used by the sidebar bell badge
- `markNotificationAsRead({ id })` — sets `read = true`
- `markAllNotificationsAsRead()` — batch updates all unread
- `addSystemNotification({ title, message, type, link? })` — server-side helper (plain async fn, not a `createServerFn`) for any domain code to fire a notification

**Route** — `src/routes/dashboard/notifications.tsx` (`/dashboard/notifications`):
- Full-page list with type-colored icons (success/error/warning/info)
- Click-to-mark-as-read per notification; "Mark all read" button
- Skeleton loading state; empty state illustration
- `highlightId` search param — if present, auto-marks that notification read and ring-highlights the card
- Polls every 15 seconds via `refetchInterval`

**Real-time wiring** — `src/routes/dashboard/route.tsx` (dashboard layout):
- Subscribes to `pb.collection('notifications')` via PocketBase realtime
- On `create`: fires a toast with the notification title/message, direct cache-writes the new item into `['notifications']` and increments `['unread-notifications-count']`
- The toast's action button navigates to `/dashboard/notifications?highlightId={id}`
- Also handles `pb.collection('messages')` for inbound WhatsApp toasts (pre-existing; the `seen` field tracking was added here to keep the unseen count accurate)

---

### 3. AI agent settings — FAQ knowledge base and system instructions (fully implemented)

Extends the existing AI Agent tab in Settings with two new sub-sections.

**PocketBase migrations:**
- `1784564000_created_faq.js` — new `faq` collection: `question` (text, required), `answer` (text, required)
- `1784564100_add_ai_system_instructions.js` — adds `ai_system_instructions` text field (max 10 000 chars) to the `settings` collection (collection ID `pbc_2769025244`)

**Server functions** — `src/features/settings/server/faq.ts`:
- `getFaqList()`, `createFaq({ question, answer })`, `updateFaq({ id, question, answer })`, `deleteFaq({ id })`
- All write operations require admin role

**Server functions** — `src/features/settings/server/ai.ts`:
- Added `systemInstructions` field to the `AiSettings` interface and to `getAiSettings()`
- New `saveAiInstructions({ instructions })` — saves `ai_system_instructions` to the settings record (requires admin)

**UI:**
- `src/features/settings/components/AiAgentTab.tsx` — now contains two sub-tabs via Shadcn `<Tabs>`:
  - **"הגדרות בסיסיות"** — model picker, temperature, max tokens, enable/disable toggle
  - **"הוראות מערכת"** — free-text `<Textarea>` for the AI system prompt prefix, saved with `saveAiInstructions`
  - **"מאגר ידע"** — the `FaqTab` component embedded as a third inner tab
- `src/features/settings/components/FaqTab.tsx` — CRUD UI for FAQ entries: add new, inline-edit existing, delete
- `src/features/settings/components/ModelSearchSelect.tsx` — searchable dropdown listing curated OpenAI model options (GPT-4o, GPT-4o mini, GPT-5 mini, o3-mini, etc.)

---

### 4. Settings server barrel refactor

`src/features/settings/server/settings.ts` is now a pure barrel:
```ts
export * from './staff'
export * from './profiles'
export * from './ai'
export * from './faq'
export * from './policy'
export * from './whatsapp'
```
Logic for each domain lives in dedicated files. Import from the barrel OR directly from the specific file — both work.

---

### 5. Leads board fixes (from 2026-07-20 — already shipped)

- Horizontal scroll scoped to the board container only
- Click-and-drag-to-pan works correctly (direction, cursor, no text selection during drag)
- Skeleton loading state instead of bare text
- `onDragStart` preventDefault bug fixed (was breaking card DnD)
- `staleTime` set on leads query to prevent silent refetch on every revisit

---

### 6. WhatsApp webhook security (from 2026-07-20 — already shipped)

- `POST /api/whatsapp-webhook` verifies `X-Hub-Signature-256` via HMAC-SHA256
- `whatsapp_app_secret` field added to `settings` collection; Settings → WhatsApp tab shows a write-only input
- `src/integrations/pocketbase/client.ts` split — client-safe code in `client.ts`, superuser code in `superuser.server.ts`

---

## Current state of the codebase

### Done and working (dev server verified)
- Auth flow: `/auth/setup` → `/auth/login` → dashboard
- Dashboard layout with real-time PocketBase subscriptions (messages + notifications)
- Conversations page (full WhatsApp chat UI)
- Leads board (Kanban) with DnD persistence
- Calendar page with appointments CRUD
- All 5 settings tabs: Team, Calendar Feeds, AI Agent, Studio Policy, WhatsApp

### Partially done
- **Google Calendar sync**: code complete, not yet live-tested with a real Google account
- **AI agent tools**: `saveAiInstructions` and FAQ data are stored correctly, but verify that the WhatsApp handler reads `ai_system_instructions` + FAQ entries and injects them into the Vercel AI SDK `system` prompt before assuming it does

### Not yet started
- AI tool-calling engine (WhatsApp → AI → tool loop) — stubs exist, production flow incomplete
- Deposit/payment collection flow
- Customer-facing booking UI

---

## Outstanding action items

1. **WhatsApp App Secret** — user must paste the Meta App Secret into Settings → WhatsApp → "App Secret". Until populated, all inbound `POST /api/whatsapp-webhook` calls return `403` (correct behavior, not a bug).

2. **Google OAuth redirect URI** — must be registered in Google Cloud Console and set in env vars before the Calendar sync can complete.

3. **AI system prompt injection** — verify the WhatsApp message handler reads `ai_system_instructions` and `faq` entries and includes them in the Vercel AI SDK `system` parameter.

4. **Leftover test data in PocketBase** (safe to delete):
   - Staff: `y7o3yqe1vp88f34`
   - Customers: `too4rgozjqcvex2` (א), `gmhzyydy28c6m0g` (ב), `7h80cmn4rt98dvt` (ג)
   - Conversations: `92n4asovbjhi5eb`, `ljp2ytlurntpwb7`
   - ⚠️ **Do NOT delete** customer `רואי חיילי` (`+972527051611`) — owner's real test number

---

## Key paths and conventions

| Thing | Value |
|---|---|
| Dev server | `pnpm --dir /home/eviltwin/Projects/inkmind-crm dev` (port 3101) |
| PocketBase binary | `pocketbase/pocketbase-bin` |
| PocketBase data | `pocketbase/pb_data` |
| PocketBase admin UI | `http://127.0.0.1:8090/_/` |
| Superuser creds | `.env` → `PB_SUPERUSER_EMAIL` / `PB_SUPERUSER_PASSWORD` |
| PB superuser client | `src/integrations/pocketbase/superuser.server.ts` — `getSuperuserClient()` |
| PB browser client | `src/integrations/pocketbase/client.ts` — `getBrowserClient()` |
| Session helper | `src/lib/session.server.ts` — `getSession()` |
| ngrok tunnels | `curl http://127.0.0.1:4040/api/tunnels` |
| Webhook logs | `curl http://127.0.0.1:4040/api/requests/http` |

### Key conventions
- Server-only code must be in `.server.ts` / `.server.tsx` files or inside a `server/` subdirectory
- `createServerFn` for all server↔client RPC — never expose PocketBase to the browser directly
- Admin-only mutations call `requireAdmin()` from `src/features/settings/server/helpers.server.ts`
- `settings` collection has exactly one row — fetch with `getFullList()`, take `[0]`; never create a second row
- RTL throughout: `dir="rtl"`, `font-assistant` class (Google Fonts Assistant in `src/styles.css`)
- Package manager: **pnpm** only

---

## Migration order (for a fresh PocketBase instance)

```
1784496479_created_studios.js
1784496480_created_customers.js
1784496480_created_staff.js
1784496481_created_conversations.js
1784496481_created_settings.js
1784496481_created_studio_closures.js
1784496482_created_artist_profiles.js
1784496482_created_credentials.js
1784496482_created_messages.js
1784496483_created_appointments.js
1784496502_deleted_users.js
1784498163_updated_*.js                  (batch of single-tenant cleanup)
1784498164_deleted_studios.js
1784498212_updated_settings.js
1784505843_updated_staff.js
1784506599_updated_staff.js
1784543640_updated_artist_profiles.js
1784547257_extend_messages_for_cloud_api.js
1784547292_updated_messages.js
1784558323_rename_lead_stage_lost_to_expired.js
1784558389_updated_customers.js
1784563336_add_whatsapp_app_secret.js    ← HMAC security
1784563337_add_google_account_fields.js  ← Google Calendar
1784564000_created_faq.js               ← AI knowledge base
1784564100_add_ai_system_instructions.js ← AI system prompt field
1784564200_seen_and_notifications.js     ← messages.seen + notifications collection
```
