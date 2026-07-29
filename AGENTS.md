<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/devtools#devtools-app-setup"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-app-setup"
    for: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
  - id: "@tanstack/devtools#devtools-marketplace"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-marketplace"
    for: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
  - id: "@tanstack/devtools#devtools-plugin-panel"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-plugin-panel"
    for: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
  - id: "@tanstack/devtools#devtools-production"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools#devtools-production"
    for: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
  - id: "@tanstack/devtools-event-client#devtools-bidirectional"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-bidirectional"
    for: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
  - id: "@tanstack/devtools-event-client#devtools-event-client"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-event-client"
    for: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
  - id: "@tanstack/devtools-event-client#devtools-instrumentation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-instrumentation"
    for: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
  - id: "@tanstack/devtools-vite#devtools-vite-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/devtools-vite#devtools-vite-plugin"
    for: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
  - id: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#lifecycle/migrate-from-nextjs"
    for: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
  - id: "@tanstack/react-start#react-start"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start"
    for: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
  - id: "@tanstack/react-start#react-start/server-components"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start/server-components"
    for: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
  - id: "@tanstack/router-core#router-core/auth-and-guards"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards"
    for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  - id: "@tanstack/router-core#router-core/code-splitting"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/code-splitting"
    for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  - id: "@tanstack/router-core#router-core/data-loading"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading"
    for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  - id: "@tanstack/router-core#router-core/navigation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation"
    for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  - id: "@tanstack/router-core#router-core/not-found-and-errors"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/not-found-and-errors"
    for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  - id: "@tanstack/router-core#router-core/path-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/path-params"
    for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  - id: "@tanstack/router-core#router-core/search-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/search-params"
    for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  - id: "@tanstack/router-core#router-core/ssr"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/ssr"
    for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  - id: "@tanstack/router-core#router-core/type-safety"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/type-safety"
    for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
  - id: "@tanstack/router-plugin#router-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin"
    for: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
  - id: "@tanstack/start-client-core#start-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core"
    for: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
  - id: "@tanstack/start-client-core#start-core/auth-server-primitives"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/auth-server-primitives"
    for: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
  - id: "@tanstack/start-client-core#start-core/deployment"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/deployment"
    for: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
  - id: "@tanstack/start-client-core#start-core/execution-model"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/execution-model"
    for: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
  - id: "@tanstack/start-client-core#start-core/middleware"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware"
    for: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
  - id: "@tanstack/start-client-core#start-core/server-functions"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions"
    for: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
  - id: "@tanstack/start-client-core#start-core/server-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes"
    for: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
  - id: "@tanstack/start-server-core#start-server-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/start-server-core#start-server-core"
    for: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
  - id: "@tanstack/virtual-file-routes#virtual-file-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/virtual-file-routes#virtual-file-routes"
    for: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
<!-- intent-skills:end -->

<!-- handoff:2026-07-20-whatsapp-security-and-leads-ui:start -->
# Session Handoff — 2026-07-20 (WhatsApp security hardening + Leads board UI)

Written for whichever agent (Antigravity or otherwise) continues this project next. This
session did NOT touch UI polish beyond the leads board — if you were asked to "continue doing
UI improvements," treat this as background/context, not a task list to redo.

## What was reviewed today

1. **Leads board UX bugs** (`/dashboard/leads`), reported by the user one at a time and fixed
   in this order:
   - Horizontal scroll leaked to the whole page (sidebar included) instead of staying inside
     the board.
   - Click-and-drag-to-pan on empty board space didn't work, then worked but in the wrong
     direction.
   - Loading state was a bare line of text instead of a skeleton.
   - A follow-up fix (`onDragStart` preventDefault) accidentally broke real card
     drag-and-drop entirely — found and fixed same session.
   - Missing hover affordance on draggable cards, cursor not switching to grab/grabbing,
     text selection firing during drag/pan, last column feeling clipped, page padding too
     tight vs. the dashboard home page.
   - Leads data was silently refetching on every page revisit despite React Query caching
     (global `staleTime` was `0`).
2. **Security review of the WhatsApp Cloud API flow**, explicitly requested by the user: is
   any secret exposed to the frontend bundle, are tokens ever used client-side, does every
   Meta-bound request go through server functions before touching env vars. Two parallel
   read-only code audits ran, corroborated by direct file reads. Findings and fixes below.
3. **A live production-ish incident**, diagnosed mid-session: after the user wiped the
   Pocketbase DB and re-entered WhatsApp settings via the UI, real inbound Meta webhooks
   started getting `403`'d. Root cause: the newly-added `whatsapp_app_secret` field was empty
   (didn't exist in their previous setup), so every genuine Meta-signed request failed HMAC
   verification. Confirmed via ngrok's local request inspector
   (`curl http://127.0.0.1:4040/api/requests/http`) showing a hard `200`→`403` transition at
   the exact moment of the DB reset. **Fix communicated to the user, not yet confirmed done on
   their end**: paste the App Secret from Meta App Dashboard → App Settings → Basic into the
   CRM's Settings → WhatsApp tab → "App Secret" field.

## Where things stand right now

- **Leads board**: all reported bugs fixed and verified (`tsc`/`eslint` clean, live browser
  checks for each fix — see git log / diff for specifics). Task list item "Verify leads board
  end-to-end" (drag-and-drop persistence, permission-lock for non-admin staff, admin override)
  was **partially** verified via synthetic DOM events and direct DB checks, but a genuine
  mouse-based (`computer` tool `left_click_drag`) drag test was never successfully completed —
  the `computer` tool's `screenshot` action was intermittently timing out in this environment
  (root cause never identified; `read_page`/`javascript_tool`/network tools all worked fine on
  the same tab throughout). If you need pixel-accurate mouse interaction testing, try the
  `computer` tool fresh — it may just have been a transient harness issue.
- **Security fixes**: implemented, unit-tested, and verified against the live dev server —
  see "Security fixes shipped" below. `whatsapp_app_secret` now required for the webhook to
  accept any inbound POST.
- **Outstanding user-side action item**: the user needs to (re-)paste their real WhatsApp App
  Secret into Settings → WhatsApp before inbound messages will flow again. Until they do,
  `POST /api/whatsapp-webhook` will correctly keep returning `403` for all traffic — that is
  expected/correct behavior now, not a bug.
- **Leftover seeded test data** in Pocketbase (customers "לקוח בדיקה א/ב/ג" + a temp staff
  account), from leads-board verification earlier in the project's history. IDs, if you need
  to clean them up:
  `{"staff": "y7o3yqe1vp88f34", "a": "too4rgozjqcvex2", "b": "gmhzyydy28c6m0g", "conv_b": "92n4asovbjhi5eb", "c": "7h80cmn4rt98dvt", "conv_c": "ljp2ytlurntpwb7"}`
  (a real customer named "רואי חיילי" also exists in this DB — that one is NOT test data, it's
  the owner's own WhatsApp test number, `+972527051611` — never delete it, see the project's
  established smoke-test-number convention).

## Security fixes shipped this session

- `pocketbase/pb_migrations/1784563336_add_whatsapp_app_secret.js` — adds hidden
  `whatsapp_app_secret` text field to the `settings` collection.
- `src/routes/api/whatsapp-webhook.ts` — POST handler now verifies Meta's
  `X-Hub-Signature-256` header via HMAC-SHA256 (constant-time compare) before processing
  anything; rejects with `403` on missing/invalid signature. Logic split into exported
  `handleWebhookGet`/`handleWebhookPost` functions (previously inline in `createFileRoute`) so
  it's directly unit-testable — see `src/routes/api/-whatsapp-webhook.test.ts` (note the `-`
  prefix: required so TanStack Router's file-based route scanner ignores it).
- `src/features/settings/server/settings.ts` / `WhatsAppSettingsTab.tsx` — new `appSecret`
  field, write-only in the UI (same pattern as the access token: server returns
  `hasAppSecret: boolean`, never the raw value).
- `src/integrations/pocketbase/client.ts` → split into `client.ts` (only the client-reachable,
  non-secret `getBrowserClient`) and new `src/integrations/pocketbase/superuser.server.ts`
  (`getSuperuserClient`, `createRequestClient` — both read `process.env.PB_SUPERUSER_*`). The
  `.server.ts` suffix gives a framework-level compile-time guarantee these can never end up in
  a client bundle, instead of relying on "every importer happens to be server-scoped" — 7
  importers were updated to the new path.
- Confirmed clean (no code changes needed): no secret is ever `VITE_`-prefixed or read via
  `import.meta.env` in a `.tsx` file; the `settings` Pocketbase collection's rules are
  superuser-only (`listRule`/`viewRule`/`updateRule`: `null`); the WhatsApp Graph API client
  (`src/integrations/whatsapp-cloud-api/client.ts`) is only ever imported from `server/` files.

## Relevant paths

**This project**: `/home/eviltwin/Projects/inkmind-crm` (TanStack Start + React 19 + Pocketbase,
Hebrew/RTL). Dev server: `pnpm --dir /home/eviltwin/Projects/inkmind-crm dev` (port 3101, see
`.claude/launch.json` config name `inkmind-crm-dev`). Pocketbase: binary at
`pocketbase/pocketbase-bin`, data at `pocketbase/pb_data`, superuser creds in `.env`
(`PB_SUPERUSER_EMAIL`/`PB_SUPERUSER_PASSWORD`), served on `127.0.0.1:8090`.

**The older prototype this project ports UI from**: `/home/eviltwin/Projects/WAHA` (Express +
WAHA-based CRM). Its `apps/ui` leads-board components (`apps/ui/src/features/leads-board` or
similar — check current WAHA source, paths may have shifted) were the source-of-truth reference
for `inkmind-crm`'s hand-rolled drag-and-drop, edge-autoscroll, and click-and-drag-to-pan logic
(no library — ported verbatim then adapted for RTL, since WAHA's UI was LTR). If asked to port
any *other* WAHA UI piece into inkmind-crm, read the corresponding WAHA component first — it's
the intended reference implementation, not something to design from scratch.

**Meta / WhatsApp Business essentials** (all require the user's own Meta login — you cannot
access these, only guide the user through them):
- App Dashboard: `developers.facebook.com/apps` → app **"Inkmind's Agent"** (NOT
  "WA DevX Webhook Events 1P App" — that's Meta's own demo app; a past incident this session
  involved the WABA being subscribed to the demo app instead of the real one).
- `WhatsApp → Configuration` — webhook Callback URL + Verify Token, and the "Webhook fields"
  Manage/Subscribe UI (subscribing the `messages` field covers both inbound messages and
  status callbacks — no need to subscribe anything else for this app's needs).
- `App Settings → Basic` — the **App Secret**, needed for the HMAC webhook verification added
  this session. Distinct from the WhatsApp access token and the webhook verify token — three
  separate secrets, all configured in the CRM's Settings → WhatsApp tab.
- Graph API Explorer (`developers.facebook.com/tools/explorer`) — fallback for manually
  calling `POST /{waba_id}/subscribed_apps` if the Configuration page's UI doesn't expose the
  subscribe toggle clearly.
- Dev-only ngrok tunnel for exposing the local webhook to Meta: check the current public URL
  via `curl http://127.0.0.1:4040/api/tunnels` (it changes if ngrok restarts — if webhooks stop
  arriving, check this first before assuming a code bug). Vite's `server.allowedHosts` in
  `vite.config.ts` is already configured for `.ngrok-free.dev`/`.ngrok-free.app`/etc.
<!-- handoff:2026-07-20-whatsapp-security-and-leads-ui:end -->

<!-- handoff:2026-07-24-refactor-ai-agent-and-modular-tools:start -->
# Session Handoff — 2026-07-24 (AI Agent Refactoring & Modular Tools)

Written for whichever agent (Claude Code, Antigravity, or other) continues this project next.

## What was done today

1. **AI Framework comparative audit**:
   - Analyzed **Vercel AI SDK**, **LangGraph**, **Mastra**, and **TanStack AI** for suitability.
   - Decided to **stay with Vercel AI SDK**. The inkmind-crm architecture is turn-based, stateless between webhook runs, and depends on **PocketBase** as the single source of truth for the conversation state (`state` column). Secondary graph-state checkers (like LangGraph's checkpointers) would cause sync conflicts when human dashboard operators manually change a conversation state in the CRM.
2. **Refactored `tools.server.ts` to Eliminate Boilerplate**:
   - Created three context helpers (`botTool`, `updateConversation`, `notifyStaff`) inside `buildBotTools` to capture tool errors, manage PocketBase updates, and coordinate staff notifications uniformly.
   - Modularized the 13 tools by splitting them into a structured sub-module package under `src/integrations/ai/tools/`:
     - [types.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools/types.ts) — The shared `ToolFactoryContext` interface.
     - [base.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools/base.server.ts) — Lifecycle and basic communication tools (`start_conversation`, `save_client_name`, `send_message`).
     - [artist.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools/artist.server.ts) — Portfolio and artist recommendation tools (`suggest_artists`).
     - [booking.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools/booking.server.ts) — Booking availability, schedules, holds, and confirmation tools (`check_availability`, `get_artist_schedule`, `collect_tattoo_info`, `confirm_booking_final`, `request_reschedule`, `request_cancel`).
     - [support.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools/support.server.ts) — General support, NPS records, and help escalations (`answer_faq`, `record_nps_score`, `call_staff`).
   - Refactored [tools.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/tools.server.ts) to serve as the unified entry point. It maps getter/setter interfaces for mutable tracking fields (like `didSendMessage`) and merges the tools object, keeping all external imports completely intact.
3. **Refactored `agent.server.ts` Caching Logic**:
   - Extracted prompt-caching properties into a helper `applyAnthropicCaching(history)` in [agent.server.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/agent.server.ts) to keep the core turn handler clean.
4. **Style Prompt Tuning**:
   - Minor tuning in [prompts.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/ai/prompts.ts) (adding instructions for line-break continuation and standard Israeli punctuation).
   - Fixed input type-casting in the tool executor loop (`input as z.infer<T>`).
5. **Google Sync Validation Fix**:
   - Fixed a PocketBase 400 validation error in [google-sync.ts](file:///home/eviltwin/Projects/inkmind-crm/src/integrations/google-calendar/server/google-sync.ts) caused by updating `google_sync_status` to `'not_synced'`. Since the select field schema only permits `['synced', 'pending', 'push_failed']` or `null`, we changed `'not_synced'` to `null` to clear the state on deletion/cancel.

## Current Project State

- **Code Health**: TypeScript compiles cleanly, all 26 unit tests are passing (`pnpm build` and `pnpm test` verified).
- **Environment**: Dev server running on `127.0.0.1:3101`.
<!-- handoff:2026-07-24-refactor-ai-agent-and-modular-tools:end -->