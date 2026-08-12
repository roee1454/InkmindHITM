# File change map

Legend: **CHANGE** = edit existing · **NEW** = create · **DELETE** = remove · **VERIFY** = confirm against your schema

Paths are relative to the repo root. Line counts are the current sizes as of `main@463610d`, given so you can
gauge scope before opening a file.

---

## 0. Foundation — do this first

| Path | Action | What to do |
| --- | --- | --- |
| `src/styles.css` | **CHANGE** (replace) | Replace wholesale with `styles.css` from this bundle. Note the alias layer is now written once via `--brand-*` instead of duplicated per mode. Keep any app-specific rules you have below section 7. |
| `src/routes/__root.tsx` | **CHANGE** | Add `data-theme="indigo"` to `<html>` (or read the chosen palette from settings). Confirm `lang="he" dir="rtl"`. Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — `viewport-fit=cover` is required for the `env(safe-area-inset-*)` values the bottom nav depends on. |
| `src/lib/utils.ts` | — | No change. `cn()` is used as-is throughout. |
| `tailwind.config.*` / `vite.config.ts` | **VERIFY** | Tailwind v4 reads `@theme` from CSS; confirm no legacy JS theme config is overriding radii or shadows. |

---

## 1. UI primitives — `src/components/ui/`

Exact className strings for the starred rows are in `UI-PRIMITIVES.md`. Do these nine first; the whole
app inherits the new feel from them.

| Path | Action | What to do |
| --- | --- | --- |
| `input.tsx` ★ | **CHANGE** | `h-12` / `md:h-11`, `text-base` / `md:text-[15px]`, `px-4`, `rounded-2xl`, `border-input/80`, `shadow-xs`, soft focus ring. |
| `select.tsx` ★ | **CHANGE** | `SelectTrigger`: `data-[size=default]:h-12`, `px-4`, `rounded-2xl`, `select-none`, `active:scale-[0.99]`, open-state ring. `SelectContent`: `rounded-2xl`, `shadow-lg`, `p-1.5`. `SelectItem`: `h-11`, `rounded-xl`, `text-[15.5px]`. |
| `button.tsx` ★ | **CHANGE** | Base gets `cursor-pointer select-none`, `rounded-2xl`, `ease-native`, `active:scale-[0.97]`. Sizes: `default h-12 md:h-11`, **new** `lg h-14 w-full`, `sm h-10 rounded-xl`, `icon size-11 rounded-2xl`. |
| `card.tsx` ★ | **CHANGE** | `rounded-3xl border-border/80 shadow-sm`. Reduce internal padding — `CardContent` was doubling up with page padding. |
| `badge.tsx` ★ | **CHANGE** | Becomes the pill: `rounded-full px-3 py-1.5 text-[12.5px] font-bold select-none`. Variants map to the five status colors in README §6. |
| `textarea.tsx` ★ | **CHANGE** | `min-h-[76px]`, `rounded-2xl`, `px-4 py-3`, `text-base`, same focus treatment as input. |
| `label.tsx` ★ | **CHANGE** | `text-sm font-bold ps-1` (RTL-safe padding). |
| `switch.tsx` ★ | **CHANGE** | Track `h-[30px] w-[50px]`, thumb `size-6`, `rounded-full`, `ease-native`. Current size is below comfortable thumb reach. |
| `tabs.tsx` ★ | **CHANGE** | Segmented-control look: `TabsList` = `bg-muted p-1 rounded-2xl`, `TabsTrigger` = `h-10 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm`, `select-none`. |
| `checkbox.tsx` | **CHANGE** | `size-6 rounded-lg` (was too small for touch), soft ring. |
| `dialog.tsx` | **CHANGE** | `rounded-3xl`, `shadow-lg`, mobile: full-width with `mx-4`. Consider routing mobile dialogs through `sheet.tsx` instead. |
| `sheet.tsx` | **CHANGE** | Bottom sheet on mobile: `rounded-t-3xl`, grab handle, `pb-[env(safe-area-inset-bottom)]`. This is the primary mobile modal pattern. |
| `select-input.tsx` | **CHANGE** | Match `field-native` height/radius. |
| `hour-picker.tsx` | **CHANGE** | 48px rows, `text-base`, `rounded-2xl`. Used by the onboarding hours step — see §5. |
| `date-picker.tsx` | **CHANGE** | Trigger matches `field-native`; popover `rounded-2xl shadow-lg`. |
| `calendar.tsx` | **CHANGE** | Day cells `size-11` minimum, `rounded-xl`, selected = solid `primary`. |
| `option-card-button.tsx` | **CHANGE** | `rounded-2xl`, `p-4`, `active:scale-[0.98]`, selected = `border-primary bg-primary/10`. |
| `dropdown-menu.tsx` | **CHANGE** | `rounded-2xl shadow-lg p-1.5`, items `h-11 rounded-xl text-[15px]`. |
| `alert-dialog.tsx` | **CHANGE** | Match `dialog.tsx`. Destructive action uses `destructive` token. |
| `table.tsx` | **CHANGE** | Desktop only. Row `h-14`, header `text-[13px] font-bold text-muted-foreground`. On mobile the tables become `.row-native` lists — see `AppointmentTable` in §4. |
| `avatar.tsx` | **CHANGE** | Default `size-[42px]`, monogram `font-extrabold bg-primary/10 text-primary`. |
| `separator.tsx` | **CHANGE** | `bg-border/60`. |
| `skeleton.tsx` | **CHANGE** | `rounded-2xl bg-muted` to match new radii. |
| `popover.tsx` | **CHANGE** | `rounded-2xl shadow-lg`. |
| `form.tsx` | **CHANGE** | Message spacing `gap-1.5`; error text `text-[13px] font-bold text-destructive`. |
| `ToastProvider.tsx` | **CHANGE** | Toast `rounded-2xl shadow-lg`; on mobile anchor **top** with safe-area inset (bottom collides with the tab bar). |

---

## 2. App chrome

| Path | Action | What to do |
| --- | --- | --- |
| `src/components/MobileTopBar.tsx` | **CHANGE** | `h-14`, `bg-card`, `border-b border-border`, title `text-[17px] font-extrabold` centered, `.tap-target` icon buttons, `select-none`. Notification dot = 8px `destructive` circle with a 1.5px card-colored ring. |
| `src/components/MobileBottomNav.tsx` | **CHANGE** | Height `4rem + env(safe-area-inset-bottom)`. Five items, 22px icon + 11.5px label, active = `primary` + `font-extrabold`, inactive = `muted-foreground` + `font-bold`. Badge = pill on the icon, `-top-1.5 -end-2`. `select-none`. |
| `src/components/Sidebar.tsx` | **CHANGE** | Desktop, fixed `w-72` (288px). Header (monogram + wordmark + bell), AI-agent status row, nav items `h-[46px] rounded-2xl` (active = `bg-primary/10 text-primary font-extrabold`), footer with user + logout. |
| `src/components/AppDrawer.tsx` | **CHANGE** | Mobile drawer mirrors the sidebar's item styling; `rounded-e-3xl`, `shadow-lg`. |
| `src/components/BrandMark.tsx` | **CHANGE** | Solid circle badge, no gradient/sparkle. Sizes: 38px sidebar, 48px header, 72px auth. |
| `src/components/navigation.ts` | **VERIFY** | Item order must match the tab bar: בית · תורים · לידים · לקוחות · שיחות. Add the notifications route if it isn't there. |
| `src/routes/dashboard/route.tsx` | **CHANGE** | 11.8kB and the layout hub. Set `data-mobile-chrome="on"`, `data-app-chrome` on chrome wrappers, apply `.page-container`. Chat detail and the leads board use `.page-container--flush`. |

---

## 3. Auth

| Path | Action | What to do |
| --- | --- | --- |
| `src/routes/auth/route.tsx` | **CHANGE** | Use `.auth-shell`. Remove any card wrapper around the form. |
| `src/features/auth/components/LoginForm.tsx` | **CHANGE** | `.auth-stack` → `.auth-badge` (72px "IM") → title 25px/800 → sub 15px → `.form-stack` with `.form-label` + `h-14` fields with leading icons → `.btn-native` "התחברות למערכת" → "שכחתי סיסמה" as a 14px bold primary text link. |
| `src/features/auth/components/SetupForm.tsx` | **CHANGE** | Same shell and spacing as LoginForm. |
| `src/routes/auth/login.tsx`, `setup.tsx` | **CHANGE** | Thin route wrappers — drop any extra padding/card now owned by `.auth-shell`. |

---

## 4. Dashboard, customers, calendar, leads — visual only, no server work

| Path | Action | What to do |
| --- | --- | --- |
| `src/routes/dashboard/index.tsx` | **CHANGE** | Flat `.page-head` greeting + date + today's count. Mount the new setup-checklist card (§5) above the metrics when the checklist is incomplete. |
| `src/features/dashboard/components/MetricsSummary.tsx` | **CHANGE** | Mobile: three `.stat-native` tiles in one row (34px icon chip, 26px value, 12.5px label). Desktop: 3-col grid, 22px padding, 38px value. |
| `src/features/dashboard/components/RecentLeadsCard.tsx` | **CHANGE** | One `.card-native` with a header row ("פניות אחרונות" + "הכל" link) and `.row-native` children: avatar → name + style → status pill. **Max 3 rows on mobile.** |
| `src/features/dashboard/components/CloseAppointmentsCard.tsx` | **CHANGE** | Same pattern; leading column is day-number + time stacked, `tabular-nums`. |
| `src/features/dashboard/components/AlertBanners.tsx` | **CHANGE** | Single solid `primary` bar, `h-13`, `rounded-2xl`, `shadow-md`, text + `arrow-left`. One banner max — collapse multiples into a count. |
| `src/features/dashboard/components/ContinuationListSheet.tsx` | **CHANGE** | Bottom sheet styling per `sheet.tsx`. |
| `src/features/customers/CustomersPage.tsx` | **CHANGE** | `field-native` search (52px, leading `search` icon) → count row + filter link → one `.card-native` list. |
| `src/features/customers/components/CustomerCard.tsx` | **CHANGE** | **Stop being a card.** Becomes a `.row-native`: 42px avatar → name + "₪X • N ביקורים" → `chevron-left`. This is the single most important list fix. |
| `src/features/customers/components/CustomersHeader.tsx` | **CHANGE** | Flat `.page-head`; `+` moves into the top bar on mobile. |
| `src/features/customers/components/CustomersSummary.tsx` | **CHANGE** | Collapses to one 13px/800 muted count line, not a card. |
| `src/features/customers/components/CustomerDialog.tsx` | **CHANGE** | Sheet on mobile, dialog on desktop. |
| `src/features/calendar/CalendarPage.tsx` | **CHANGE** | 12.4kB. Mobile: week date strip (7 cells, selected = solid primary `rounded-2xl`) + day/month segmented toggle + status filter chips + day timeline. |
| `src/features/calendar/components/CalendarViewToggle.tsx` | **CHANGE** | Segmented control per new `tabs.tsx`. |
| `src/features/calendar/components/AppointmentTable.tsx` | **CHANGE** | Desktop table only. On mobile render `DailyAppointmentCards` instead. |
| `src/features/calendar/components/DailyAppointmentCards.tsx` | **CHANGE** | Timeline row: 52px `tabular-nums` time gutter + card with `border-s-4` in the status color, name + status pill, style + duration, price + deposit state. |
| `src/features/calendar/components/CalendarFilters.tsx` | **CHANGE** | Horizontal scrolling chips, 38px tall, active = solid primary. |
| `src/features/calendar/components/{CalendarGrid,WeekGrid,MonthGrid,CalendarHeader}.tsx` | **CHANGE** | Retune to new radii/borders; keep `artist-colors.ts` mapping. |
| `src/features/calendar/components/AppointmentFormFields.tsx` | **CHANGE** | 20.5kB, the biggest form in the app. All fields to `h-12`/`text-base`, `gap-3.5` stack, sticky `.btn-native` footer on mobile. **Add duration + price-range fields** — see §6. |
| `src/features/calendar/components/{CreateAppointmentDialog,EditAppointmentDialog}.tsx` | **CHANGE** | Sheet on mobile. |
| `src/features/calendar/components/ImageGalleryDialog.tsx` | **CHANGE** | Reused by the conversation ⋮ menu (§6) — generalize it to take a title + image list + optional receipt metadata. |
| `src/features/calendar/components/ArtistLegend.tsx` | **CHANGE** | Pills, not squares. |
| `src/features/leads/components/LeadsBoardPage.tsx` | **CHANGE** | Mobile: stage filter chips + a single column of lead cards with the next column peeking ~22px at the edge (swipe affordance). Desktop: horizontal-scroll kanban, 236px columns, active drop target = `border-primary border-dashed`. |
| `src/features/leads/components/LeadCard.tsx` | **CHANGE** | `rounded-2xl border-border/80 p-3.5 gap-2.5`: source row (icon + label + ⋮) → name 16px/800 → assigned artist → divider → relative time + "פתח שיחה" primary link. Locked (no permission) = `opacity-65` + `lock` icon, no ⋮. |
| `src/features/leads/components/LeadColumn.tsx` | **CHANGE** | Column header = stage pill + count; body `p-3 gap-2.5`. |
| `src/features/leads/components/LeadsHeader.tsx` | **CHANGE** | Flat `.page-head`. |
| `src/features/leads/components/LeadsBoardSkeleton.tsx` | **CHANGE** | Match new card geometry. |
| `src/routes/dashboard/notifications.tsx` | **CHANGE** | 7.8kB. Grouped `.card-native` lists under 13px/800 muted date headers (היום / אתמול / השבוע). Unread row = `bg-primary/5` + 8px primary dot in the leading position. Header action "סמן הכל כנקרא". Empty state = 64px muted icon + one line. |

---

## 5. Onboarding restructure — the largest change

Current flow: `profile → whatsapp → artist-profile → hours → team → calendar` (6 blocking steps).
New flow: **`studio → hours → profile-links → done`** (3 required + a completion screen), everything else
moves to a non-blocking checklist.

### Routes

| Path | Action | What to do |
| --- | --- | --- |
| `src/routes/onboarding/route.tsx` | **CHANGE** | 6.2kB → much smaller. **Delete** the logo, sparkle badge, `h1`, subtitle, and progress card (~260px of chrome above the first field). Replace with: a 3px `.step-progress` bar, a 52px row holding back / "N מתוך 3" / "דלג", and `<Outlet/>`. Step count comes from a single source of truth (see `onboarding-steps.ts`). |
| `src/routes/onboarding/studio.tsx` | **NEW** | Step 1. Question "איך קוראים לסטודיו שלך?" + hint. One 60px name field (autofocus), then an optional logo row (56px dashed circle + "להוסיף לוגו?" + "העלאה"). Footer: `.btn-native` "המשך" + 13.5px muted "אפשר לשנות הכל אחר כך בהגדרות". |
| `src/routes/onboarding/hours.tsx` | **CHANGE** (rewrite) | 11.1kB → ~3kB. Stop asking for 7 rows of toggles + 2 pickers. It already computes Sun–Thu 10:00–18:00 — **show that as the answer and ask for confirmation.** Card contains: 7 day chips (46px, active = solid primary), one big `10:00 עד 18:00` line (30px/800 `tabular-nums`), three preset buttons (בוקר 09–17 / סטנדרט 10–18 / ערב 12–20). Footer: `.btn-native` with a check icon + "כן, זה מדויק", then "עריכת יום ספציפי" as a text link into the detailed editor. |
| `src/routes/onboarding/profile-links.tsx` | **NEW** | Step 3, replacing the style picker. Question "ספר לנו עליך" + hint "כדי שהסוכן יפנה לקוחות לתיק העבודות שלך. הכל אופציונלי." Four fields: instagram (`at-sign`, `dir="ltr"`), portfolio URL (`image`), website (`globe`), bio textarea. Footer: `.btn-native` "סיום". |
| `src/routes/onboarding/done.tsx` | **NEW** | Centered 92px success circle, "הסטודיו מוכן", one reassuring line, a WhatsApp-connected status row (auto-checked, no action), `.btn-native` "כניסה למערכת", and "נשארו N הגדרות לא־חובה" beneath. |
| `src/routes/onboarding/profile.tsx` | **DELETE** | 8.6kB. Split: studio name + logo → `studio.tsx`; payment instructions + closures → the checklist / `StudioPolicyTab`. |
| `src/routes/onboarding/whatsapp.tsx` | **DELETE** | Read-only screen with nothing to fill in (credentials are server env). Becomes a status row on `done.tsx` and in the checklist. |
| `src/routes/onboarding/team.tsx` | **DELETE** | Empty for a solo artist. Becomes a checklist item → `TeamAccessTab`. |
| `src/routes/onboarding/calendar.tsx` | **DELETE** | Per-member OAuth. Becomes a checklist item → `GoogleCalendarConnection`. |
| `src/routes/onboarding/artist-profile.tsx` | **DELETE** | Superseded by `profile-links.tsx`. |
| `src/routeTree.gen.ts` | **CHANGE** | Regenerated by TanStack — don't hand-edit; run the dev server. |

### Components & logic

| Path | Action | What to do |
| --- | --- | --- |
| `src/features/onboarding/onboarding-steps.ts` | **NEW** | Single source of truth: `[{ id:'studio', route, required:true }, { id:'hours' }, { id:'profile-links' }]` + helpers `stepIndex()`, `nextStep()`, `progressPercent()`. The route shell and every step read from this. |
| `src/features/onboarding/components/SetupChecklist.tsx` | **NEW** | The 7-item non-blocking list: one `.card-native` with a header (title + "N / 7" + 7px progress bar) and `.row-native` items (36px icon chip → title + why-it-matters → `chevron-left` or a status pill). Items: WhatsApp (auto, `success` pill "מחובר"), Google Calendar, deposit payment method, team members, closure days, links & bio, FAQ. Footer row "הצג את כל השבע". Used on the dashboard (collapsed to 3 rows) and on the full checklist screen. |
| `src/routes/dashboard/setup.tsx` | **NEW** | Full checklist screen. Header "השלמת הגדרה", intro line "אף אחת מאלה לא חוסמת אותך. הסוכן עובד גם בלעדיהן.", the 7 rows, and a muted footer link "לא עכשיו — הזכר לי בעוד שבוע". |
| `src/features/onboarding/components/StyleTagSelector.tsx` | **DELETE** | Removed from the product entirely. |
| `src/features/onboarding/components/ArtistProfileEditor.tsx` | **CHANGE** | Drop style tags; add instagram / portfolio / website / bio. Keep it as the shared editor used by both onboarding and settings. |
| `src/features/onboarding/components/WorkHoursEditor.tsx` | **CHANGE** | Becomes the "עריכת יום ספציפי" detail view behind the confirm screen, not the default. 48px rows. |
| `src/features/onboarding/components/work-hours.ts` | **CHANGE** | Export the default preset (Sun–Thu 10:00–18:00) and the three presets so the confirm screen and the editor share them. |
| `src/features/onboarding/components/StaffManager.tsx` | **CHANGE** | 12.2kB. No longer an onboarding step — reachable from the checklist and settings. Retune to new list/field styling. |

### Server

| Path | Action | What to do |
| --- | --- | --- |
| `src/features/onboarding/server/onboarding.ts` | **CHANGE** | Step tracking now covers 3 required steps. Add `skipStep`, and a `setup_checklist` state object (per-item `done` / `dismissed` / `snooze_until`). `completeOnboarding` must succeed with only the 3 required steps done. |
| `src/features/settings/server/profiles.ts` | **CHANGE** | 9.2kB. Remove `style_tags` from read/write/validation; add `instagram`, `portfolio_url`, `website_url`, `bio` (validate URL shape, allow empty). |
| `src/features/notifications/server/notifications.ts` | **CHANGE** | Emit a notification when a checklist item becomes relevant (e.g. first deposit requested with no payment method configured). |
| `src/integrations/ai/prompts.ts` | **CHANGE** | 33.4kB. **Remove the style-tag section**; feed the artist `bio` + portfolio/instagram links instead so the agent can point customers at real work. Update `prompts.test.ts` fixtures. |
| `src/integrations/ai/prompts.test.ts` | **CHANGE** | Fixtures reference style tags. |
| `src/integrations/ai/tools/artist.server.ts` | **CHANGE** | Artist lookup tool returns bio + links instead of tags. |

---

## 6. Conversations — HITL blocks

Four action blocks now appear in the message feed. Each is one compact row (or a 3-box row for the quote),
never a tall card — see `.hitl-row` / `.hitl-action` in `styles.css`.

| Block | Content | Primary action |
| --- | --- | --- |
| **Quote** | 3 boxes: משך (`3 שעות`) · טווח מחיר (`₪1,600–2,000`) · מקדמה (`₪300`) | "שליחת הצעה ללקוח" |
| **Slot confirm** | `מועד: יום ד׳ 12/08 · 16:00` | "אישור" |
| **Receipt approve** | `אסמכתה: ₪300 ביט` + muted "דחייה" | "אישור" |
| **Final confirm** | `אישור סופי — התור נקבע` (emerald border) | "שליחה" |

| Path | Action | What to do |
| --- | --- | --- |
| `src/features/conversations/components/ConversationThread.tsx` | **CHANGE** | 18.6kB. Header: back chevron + 40px avatar + name + "סוכן AI פעיל" with a 7px success dot + 23h-window note (desktop) + "העברה לצוות" + ⋮. Feed: 16px/`gap-7px`, date chips, bubbles per below. Composer: 46px attach / input / send, `bg-card` with top border, safe-area padding. Full-bleed (no top bar / tab bar) on mobile. |
| `src/features/conversations/components/MessageBubble.tsx` | **CHANGE** | Inbound: `bg-card border-border rounded-[20px_20px_20px_6px]`, 15.5px text, 11.5px time bottom-left. Outbound: `bg-primary text-primary-foreground rounded-[20px_20px_6px_20px]`, `shadow` tinted with primary, time + `check-check`. Max width 78% mobile / 58% desktop. Image messages: `p-2` wrapper, `rounded-[14px]` media. |
| `src/features/conversations/components/BookingActionCard.tsx` | **CHANGE** | 8.7kB. Refactor into the four `.hitl-row` variants above; drop the tall bordered-card layout. |
| `src/features/conversations/components/sheets/InFeedActionCard.tsx` | **CHANGE** | Shared shell for all four blocks — this is where `.hitl-row` should live. |
| `src/features/conversations/components/sheets/PriceQuoteSheet.tsx` | **CHANGE** | 7.8kB. **Replace the single price input with `price_min` + `price_max`** (validate `max >= min`) and **add a duration field** (`duration_minutes`, stepper or select in 30-min increments). Deposit stays a single number. Display format: `₪1,600–2,000`. |
| `src/features/conversations/components/sheets/CalendarSlotSheet.tsx` | **CHANGE** | 5.0kB. Feeds the slot-confirm row; show date + time with `tabular-nums`, offer alternate slots. |
| `src/features/conversations/components/sheets/ReceiptVerificationSheet.tsx` | **CHANGE** | 4.5kB. Receipt thumbnail + amount + method + time; approve / reject. |
| `src/features/conversations/components/sheets/FinalBookingLockSheet.tsx` | **CHANGE** | 4.6kB. Summary line `12/08 16:00 · מקדמה שולמה` + emerald confirm. |
| `src/features/conversations/components/sheets/HealthDeclarationSheet.tsx` | **CHANGE** | Restyle to match; no structural change. |
| `src/features/conversations/components/sheets/index.ts` | **CHANGE** | Export any new shell/row components. |
| `src/features/conversations/components/InspirationGalleryDialog.tsx` | **NEW** | What the ⋮ menu opens. Two segmented tabs — **תמונות השראה** (grid of customer-sent reference images, tap to zoom) and **אסמכתות** (receipt list: thumbnail + amount + method + timestamp + approval status pill). Reuse/generalize `calendar/components/ImageGalleryDialog.tsx` rather than writing a second lightbox. |
| `src/features/conversations/components/ConversationList.tsx` | **CHANGE** | 4.5kB. `.row-native`s: 46px avatar → name + time (top line) → last-message preview + unread badge or handler pill (bot / צוות / הוסלם / סגור). Selected (desktop) = `bg-primary/10` + `border-s-[3px] border-primary`. |
| `src/features/conversations/components/ConnectionStatusBanner.tsx` | **CHANGE** | Thin `warning` bar, `rounded-2xl`. |
| `src/features/conversations/lib/format.ts` | **CHANGE** | Add `formatPriceRange(min, max)` → `₪1,600–2,000` and `formatDuration(minutes)` → `3 שעות` / `שעה וחצי`. |
| `src/features/conversations/lib/media.ts` | **CHANGE** | Expose a receipts-only selector for the gallery's second tab. |
| `src/features/conversations/types.ts` | **CHANGE** | Quote type: `price_min`, `price_max`, `duration_minutes` (drop `price`). Add the receipt/approval shapes the gallery reads. |
| `src/features/conversations/server/state-machine.ts` | **CHANGE** | 5.0kB. Formalize `quote_pending → slot_pending → receipt_pending → confirmed`, with the rejection edges. |
| `src/features/conversations/server/state-machine.test.ts` | **CHANGE** | Cover the new transitions. |
| `src/features/conversations/server/messages.ts` | **CHANGE** | 17.1kB. Persist and send duration + price range; message templates must render the range, never a single price. |
| `src/features/conversations/store/conversationsUiStore.ts` | **CHANGE** | Add `galleryOpen`, `galleryTab: 'images' \| 'receipts'`. |
| `src/integrations/ai/tools/booking.server.ts` | **CHANGE** | 15.9kB. Quote tool signature takes `price_min`, `price_max`, `duration_minutes`. |
| `src/integrations/ai/prompts.ts` | **CHANGE** | Teach the agent to propose a range and a duration, and never to state an exact price before your approval. |
| `src/features/calendar/server/bot-appointments.ts` | **CHANGE** | 9.9kB. Accepts duration from the quote when creating the appointment. |

---

## 7. Settings

Mobile is a **menu + one screen per section**; desktop is a three-pane layout (sidebar 288 · section list 236 · content).
The Team screen is the one that got a real redesign: a narrow member list on the side and a single detail
card with three tabs (פרופיל / שעות עבודה / גישה), replacing the nested-card layout.

| Path | Action | What to do |
| --- | --- | --- |
| `src/routes/dashboard/settings.tsx` | **CHANGE** | 6.1kB. Mobile: profile header + one `.card-native` menu (7 rows: כללי · מדיניות הסטודיו · צוות והרשאות · יומן Google · סוכן AI · שאלות נפוצות · גיבויים) + destructive "התנתקות". Desktop: three panes. Each section is its own mobile screen with a back chevron. |
| `src/features/settings/components/TeamAccessTab.tsx` | **CHANGE** (redesign) | 17.6kB. Desktop: 214px member list (selected = solid primary card) + detail card with header (name + email + role/password pills), a 3-tab segmented control, a 2-col field grid, bio, the Google Calendar row, and a footer with "כל השדות אופציונליים" + "שמור". Mobile: member list screen → member detail screen with the same tabs and a sticky save. |
| `src/features/settings/components/GoogleCalendarConnection.tsx` | **CHANGE** | 10.5kB. Simplify to one quiet row: `calendar-days` icon chip → "Google Calendar" + account email (`dir="ltr"`) → success dot + "מחובר" → muted "נתק". Disconnected state: same row, primary "חבר יומן". **No logo, no gradient, no large card.** |
| `src/features/settings/components/ArtistProfileEditor.tsx` | **CHANGE** | 22.3kB, the largest file in the change set. Remove the style-tag block; add instagram / portfolio / website / bio. Consider extracting shared pieces with the onboarding editor. |
| `src/features/settings/components/GeneralSettingsTab.tsx` | **CHANGE** | Studio name + logo. Add the **palette picker** (4 swatch options) + light/dark toggle if you expose theming to users. |
| `src/features/settings/components/StudioPolicyTab.tsx` | **CHANGE** | 5.6kB. Deposit payment instructions (textarea), cancellation window (select), closure days list. |
| `src/features/settings/components/ClosuresSection.tsx` | **CHANGE** | `.card-native` + `.row-native` (name + date range). |
| `src/features/settings/components/AddClosureDialog.tsx` | **CHANGE** | Sheet on mobile. |
| `src/features/settings/components/AiAgentTab.tsx` | **CHANGE** | 21.0kB. Active toggle row (38px icon chip + title + description + switch), model select, temperature slider (6px track, 22px thumb, value shown in primary), custom-instructions textarea, sticky save. |
| `src/features/settings/components/ModelSearchSelect.tsx` | **CHANGE** | 48px trigger, `rounded-2xl` popover, 44px options. |
| `src/features/settings/components/FaqTab.tsx` | **CHANGE** | 8.3kB. **Its own mobile screen.** One `.card-native`, each row = question 15.5px/800 + answer 14px muted. `+` in the top bar. |
| `src/features/settings/components/BackupSettingsTab.tsx` | **CHANGE** | 11.3kB. **Its own mobile screen**, separate from FAQ. "גיבוי עכשיו" outline button + `.card-native` list (timestamp + size/type + "שחזור"). |
| `src/features/settings/components/{WhatsAppSettingsTab,WhatsAppDiagnostics}.tsx` | **CHANGE** | Diagnostics becomes a read-only status card reachable from the checklist. `WhatsAppSettingsTab.tsx` is a 92-byte stub — **delete it** if nothing imports it after the onboarding change. |
| `src/features/settings/components/{SetPasswordForm,EditStaffInfoForm}.tsx` | **CHANGE** | New field/button styling; used inside the Team detail tabs. |
| `src/features/settings/store/settingsUiStore.ts` | **CHANGE** | Add `selectedStaffId`, `staffDetailTab: 'profile' \| 'hours' \| 'access'`, and mobile section navigation state. |
| `src/features/settings/server/profiles.ts` | **CHANGE** | See §5 (fields). |
| `src/features/settings/server/staff.ts` | **CHANGE** | Return `google_calendar_connected` per member so the list can show the "אין יומן" pill. |

---

## 8. Data model — **VERIFY** collection names against your PocketBase schema

| Collection (expected) | Field | Change |
| --- | --- | --- |
| artist profiles | `style_tags` | **REMOVE** (migrate: concatenate existing tags into `bio` so nothing is lost) |
| artist profiles | `instagram` | **ADD** text, optional |
| artist profiles | `portfolio_url` | **ADD** url, optional |
| artist profiles | `website_url` | **ADD** url, optional |
| artist profiles | `bio` | **ADD** text (max ~280), optional |
| appointments / quotes | `price` | **REPLACE** with `price_min` + `price_max` (number). Migration: set both to the old `price`. |
| appointments / quotes | `duration_minutes` | **ADD** number, default 60 |
| studio settings | `onboarding_completed_steps` | **CHANGE** to the 3-step id set |
| studio settings | `setup_checklist` | **ADD** json: `{ [itemId]: { done, dismissed, snooze_until } }` |
| studio settings | `theme_palette` | **ADD** enum `indigo \| nordic \| obsidian \| terracotta`, default `indigo` (only if you expose the picker) |

Write the migration before touching `PriceQuoteSheet` — the range fields are read in several server paths
(`messages.ts`, `booking.server.ts`, `bot-appointments.ts`, `appointments.ts`) and a partial rollout will
produce quotes with no price at all.

---

## 9. Files deliberately **not** changing

`src/lib/*` (except nothing), `src/integrations/pocketbase/*`, `src/integrations/whatsapp-cloud-api/*`,
`src/integrations/hebcal/*`, `src/routes/api/*`, `src/hooks/*`, `src/features/calendar/{date-utils,overlap-layout,artist-colors}.ts`,
`src/features/leads/lib/*`, `src/features/*/server/*` not listed above.

The redesign is deliberately scoped so that data access, WhatsApp transport, and scheduling math are
untouched. If you find yourself editing `overlap-layout.ts` or `client.ts`, stop and re-read the spec.
