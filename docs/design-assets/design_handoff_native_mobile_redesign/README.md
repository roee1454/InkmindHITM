# Handoff: Inkmind CRM — Native Mobile Redesign

**Target repo:** `roee1454/InkmindHITM` (`main`)
**Stack:** React + TanStack Start + Tailwind CSS v4 + PocketBase, RTL Hebrew
**Design source:** `Inkmind Native Design System.dc.html` (in this bundle)

---

## 1. What this bundle is

The HTML file in this bundle is a **design reference**, not production code. It is a single self-contained
prototype that renders every screen of the redesign at real device sizes, with a live palette switcher.

Your task is **not** to copy its markup. Its markup is inline-styled on purpose (it had to paint instantly in
a design tool). Your task is to **recreate these designs inside the existing codebase** using its established
patterns: TanStack Start file routes, the `src/components/ui/*` primitives, Tailwind v4 utility classes,
`cn()` from `src/lib/utils.ts`, the Zustand UI stores, and the existing server-function layer.

Every color, size, radius, and shadow in the prototype maps to a token defined in `styles.css` in this
bundle. Implement against the tokens, not against the hex codes baked into the prototype.

## 2. Fidelity

**High fidelity.** Colors, type sizes, control heights, radii, shadows, spacing, and copy are all final and
intentional. Match them. Where the prototype and this README disagree, **this README wins** (the prototype
has a few compressed spots where a screen had to fit a fixed-height phone frame).

## 3. What changes, in one paragraph

Controls get taller and rounder (48/56px, 16px baseline text, 18–22px radii), focus rings become soft
tinted rings instead of hard outlines, every pressable thing gets `active:scale-[0.97]` + `select-none`,
nested cards are replaced by one card per list with divided rows, the 6-step blocking onboarding becomes
3 steps plus a non-blocking setup checklist, the conversation HITL flow gains duration + price-range +
slot-confirm + receipt-approve + final-confirm blocks, and the whole thing runs on one of four swappable
theme palettes.

## 4. Read these next, in order

| File | What's in it |
| --- | --- |
| `styles.css` | Drop-in replacement for `src/styles.css`. Tokens, 4 palettes (light+dark), base layer, utility classes. |
| `FILE-CHANGE-MAP.md` | Every file to create, change, or delete — UI, server, schema. Start here for scoping. |
| `UI-PRIMITIVES.md` | Exact `className` strings for each `src/components/ui/*` component. |
| `SCREENS.md` | Per-screen layout specs: structure, sizes, copy, states. |
| `Inkmind Native Design System.dc.html` | The visual reference. Open in a browser. Switch palettes at the top. |

## 5. Design tokens (summary — full definitions in `styles.css`)

**Control heights** — mobile / desktop
- Primary CTA: `h-14` (56px) / `h-12` (48px), full-width on mobile
- Input, select, picker: `h-12` (48px) / `h-11` (44px)
- Icon-only button: `size-11` (44px) — never smaller, this is the tap-target floor
- Bottom tab bar: `4rem` + `env(safe-area-inset-bottom)`; top bar: `3.5rem`
- List row: `py-3` + 40–46px avatar

**Type** — Assistant, weights 400/500/700/800
- Screen title 23px/800 · Section title 16.5–18px/800 · Row title 15–15.5px/700
- Body & all inputs 16px (mobile) / 15px (desktop) — **16px is a hard floor on inputs**, below it iOS Safari zooms on focus
- Meta 13px/500 · Pill 12.5px/700 · Tab label 11.5px/700-800

**Radii** — `--radius-lg: 18px` (fields, buttons) · `--radius-xl: 22px` (cards) · `--radius-2xl: 26px` · `--radius-3xl: 32px` (list cards) · `rounded-full` (avatars, pills)

**Elevation** — never a hard drop shadow
- `shadow-xs` `0 1px 2px rgb(16 24 40 / .04)` — fields, quiet cards
- `shadow-sm` `0 1px 3px rgb(16 24 40 / .06), 0 1px 2px -1px rgb(16 24 40 / .04)` — cards
- `shadow-md` `0 4px 16px -4px rgb(16 24 40 / .10)` — primary CTA
- `shadow-lg` `0 12px 32px -8px rgb(16 24 40 / .14)` — popovers, sheets

**Motion** — `--ease-native: cubic-bezier(0.16, 1, 0.3, 1)`, default duration `150ms`
- Tap: `active:scale-[0.97]` on buttons, `active:scale-[0.99]` on wide selects, `active:bg-muted` on list rows
- Focus: `focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10`

**Four palettes**, each with light + dark, selected by `data-theme` on `<html>`:
`indigo` (default) · `nordic` · `obsidian` · `terracotta`. See `styles.css`.

## 6. Semantic status colors (used by every pill and status dot)

| Meaning | Token | Pill classes |
| --- | --- | --- |
| Waiting on you (quote, approval) | `primary` | `pill bg-primary/10 text-primary` |
| Confirmed / paid / connected | `success` | `pill bg-emerald-500/12 text-emerald-600` |
| Waiting on customer (deposit, approval) | `warning` | `pill bg-amber-500/12 text-amber-600` |
| Expired / cancelled / failed | `destructive` | `pill bg-rose-500/10 text-rose-600` |
| Neutral / new / closed | `muted` | `pill bg-muted text-muted-foreground` |

Never introduce a sixth status color. If a new state appears, map it onto one of these five.

## 7. Global rules that apply everywhere

1. **16px minimum on every input, select, and textarea.** Enforced in `@layer base` in `styles.css`; do not
   override it with `text-sm` on a form control.
2. **44px minimum tap target.** Icon-only buttons are `size-11`. Chrome buttons use `.tap-target`.
3. **`select-none` on everything that isn't prose** — nav, tab bars, headers, pills, buttons, list rows.
   Long-pressing a tab and getting a text-selection handle is the loudest "this is a website" tell.
4. **One card per list, not one card per row.** `.card-native` wrapper + `.row-native` children with
   `divide-y divide-border/60`. Nested cards are the single biggest visual regression to avoid.
5. **Flat page headers.** A page title is text on the background — never boxed in its own card.
6. **No hard focus outlines.** Soft tinted ring only.
7. **`-webkit-tap-highlight-color: transparent`** globally (in base layer) — kills the grey flash on tap.
8. **RTL:** use logical properties everywhere (`ps-*`, `pe-*`, `ms-*`, `me-*`, `start-*`, `end-*`,
   `border-s`, `border-e`). Chevrons point **left** (`chevron-left`) for "forward/drill in", **right**
   (`chevron-right`) for "back". Phone numbers, emails, URLs, and times are `dir="ltr"`.
9. **Latin numerals + `tabular-nums`** on times, prices, dates, and counters so they don't jitter.

## 8. Non-visual behavior changes bundled into this redesign

These are product changes, not skin changes. They are why server files appear in the change map.

**A. Onboarding: 6 blocking steps → 3 + a checklist.**
Only studio name, working hours, and artist profile links remain required. WhatsApp becomes a read-only
status row (its credentials live in server env — there was never anything to fill in). Team and Google
Calendar move to a non-blocking "השלמת הגדרה" checklist surfaced on the dashboard. Every step gets a
skip. Hours are **pre-filled and confirmed** ("כן, זה מדויק") instead of filled from scratch.

**B. Style-tag picker is deleted** from onboarding and from settings. The artist profile now carries
instagram handle, portfolio URL, website URL, and a short free-text bio instead. The AI prompt must read
the bio rather than a tag array.

**C. Conversation HITL blocks.** The price-quote block now takes a **work duration** and a **price range**
(min–max) instead of a single exact price. Three new blocks join it: slot confirmation, receipt approval,
and final booking confirmation. Each is a compact one-or-two-row card in the message feed with a single
primary action.

**D. Conversation overflow menu (⋮)** opens inspiration images and payment receipts for that conversation
in a dialog, instead of being a placeholder.

## 9. Suggested implementation order

1. `src/styles.css` — tokens, palettes, base layer, utilities. Nothing else works before this.
2. `src/components/ui/*` primitives — input, select, button, card, badge, textarea, label, switch, tabs.
   The whole app inherits the new feel from these nine files.
3. App chrome — `MobileTopBar`, `MobileBottomNav`, `Sidebar`, `AppDrawer`, `dashboard/route.tsx`.
4. Dashboard, customers, calendar, leads screens (visual only — no server work).
5. Conversation HITL blocks + their server/state-machine changes.
6. Onboarding restructure + setup checklist (largest change; touches routes, server, schema).
7. Settings screens.

Steps 1–4 are pure UI and can ship on their own. 5–7 need schema and server work.

## 10. Assets

No new image assets. Icons are **Lucide** (already a dependency) at 17–22px. The prototype's
`repeating-linear-gradient` hatched rectangles are placeholders for real customer-uploaded reference
images — wire them to the existing media pipeline (`src/features/conversations/lib/media.ts`).

The Google Calendar row uses a plain text label and a colored status dot — deliberately no Google logo,
so nothing needs licensing or asset management.

## 11. Verification checklist

- [ ] Every input/select/textarea computes to `font-size: 16px` on mobile widths
- [ ] Tapping a tab, pill, or list row never shows a text-selection handle or a grey flash
- [ ] No focus ring is a hard 2px outline
- [ ] No card is nested inside another card
- [ ] All four `data-theme` values render correctly in light **and** dark
- [ ] RTL: no `left/right` in new code; chevrons point the correct way
- [ ] Bottom nav clears the home indicator on a notched device
- [ ] Onboarding is completable in 3 screens without scrolling on a 390×844 viewport
- [ ] Every screen in `SCREENS.md` exists and matches
