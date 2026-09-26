---
name: Inkmind CRM
description: Dark-first studio console for a single tattoo studio's bookings, conversations and projects
colors:
  bg: "#0a0a0b"
  surface: "#141415"
  surface-2: "#1e1e20"
  border: "#2a2a2d"
  text: "#ffffff"
  muted-text: "#9a9a9f"
  accent-fill: "#f4f4f5"
  accent-ink: "#d4d4d8"
  accent: "#a1a1aa"
  on-accent: "#18181b"
  accent-soft: "rgba(244,244,245,0.20)"
  status-new: "#a8a8ad"
  status-new-border: "#34343a"
  status-wait: "#d4d4d8"
  status-wait-soft: "rgba(244,244,245,0.20)"
  status-done: "#5fcf8e"
  status-done-soft: "rgba(95,207,142,0.14)"
  status-dead: "#a8a8ad"
  status-dead-soft: "rgba(154,154,159,0.14)"
  destructive: "#f97066"
  success: "#5fcf8e"
  warning: "#e0a145"
  artist-1: "#eb9077"
  artist-2: "#96c4ac"
  artist-3: "#d9b055"
  artist-4: "#b385b6"
  artist-5: "#79a5c0"
  artist-6: "#de94a0"
  artist-7: "#94b374"
  artist-8: "#c78d5b"
typography:
  display:
    fontFamily: "Assistant, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.8125rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Open Sans, Assistant, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.4375rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Open Sans, Assistant, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "Open Sans, Assistant, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Open Sans, Assistant, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.78125rem"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  inset: "8px"
  control: "10px"
  card: "12px"
  pill: "9999px"
spacing:
  page-inline-mobile: "1rem"
  page-block-mobile: "1.25rem"
  page-inline-desktop: "2.5rem"
  page-block-desktop: "2rem"
  section-gap-mobile: "1.125rem"
  section-gap-desktop: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    height: "56px mobile / 48px desktop"
    padding: "0 1.5rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-fill}"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: "56px mobile / 48px desktop"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  field:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "48px mobile / 44px desktop"
    padding: "0 1rem"
  pill:
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
    padding: "6px 12px"
---

# Design System: Inkmind CRM

## 1. Overview

**Creative North Star: "The Quiet Workbench"**

Inkmind is a craftsperson's tool laid out at rest: near-black surfaces, one monochrome accent, and nothing on the bench that isn't there to be used. The palette collapses eleven ad-hoc hues down to four status roles and a single accent ramp on purpose — a studio running one tattoo shop doesn't need a color for every idea, it needs to trust that grey means "waiting," green means "done," and nothing else is trying to get its attention. Corners, shadows and motion follow the same discipline: three radius roles (not seven), two elevation roles (not a shadow scale), one easing curve. The system explicitly rejects the generic SaaS look — recycled KPI-row dashboards, gradient text, a "safe" cream body background chosen by default — and just as explicitly rejects the light, card-heavy competitor look (Pencild.co) and the glassmorphism-by-default open-source alternative (Poli-International/studio-crm): this is a dark, professional operator's console, not a consumer app.

Dark is the studio's stated identity (`docs/design-system.md`: "Default to a dark, cohesive color scheme"), and the frontmatter above carries the dark-mode values as canonical. A fully-specified light mode exists in the codebase (`src/styles.css` `:root`, before `.dark` is applied) and is respected when the OS is in light mode or the user picks it explicitly — see **Light mode** at the end of §2. Both modes share the same structure; only the values invert.

**Key Characteristics:**
- Monochrome accent — near-white in dark mode, near-black in light — never a saturated brand hue.
- Four status roles, not eleven ad-hoc colors: new (outline), wait (rides the accent), done (green), dead (filled grey).
- Three radius roles and two elevation roles; nothing invents a fourth depth or an eighth corner.
- One card treatment, used flat everywhere; no nested cards.
- RTL Hebrew first: logical properties throughout, directional icons flipped, no hardcoded left/right.

## 2. Colors

Restrained by design: the accent is monochrome, and color is spent entirely on the four status roles plus the destructive/success/warning trio reserved for actions and outcomes, never decoration.

### Primary
- **Near-White Fill** (`#f4f4f5`, dark mode): the one filled surface in the whole system — primary buttons, the active nav indicator, the selected tab. In light mode this inverts to **Near-Black Fill** (`#18181b`) so a filled control always reads as the darkest or lightest shape on the page, whichever contrasts more.
- **Pale Steel Ink** (`#d4d4d8`, dark mode / `#18181b` light — "accent-ink"): the non-filled accent — links, active nav text, the "wait" status. Rarer than the fill; used for emphasis, not shape.

### Neutral
- **Near-Black Charcoal** (`#0a0a0b`): page background.
- **Elevated Charcoal** (`#141415`): card and panel surfaces — one step lighter than the page, never more.
- **Charcoal Panel** (`#1e1e20`): the secondary surface — muted backgrounds, secondary buttons, chip fills.
- **Charcoal Hairline** (`#2a2a2d`): every border in the system. Flat elevation is a border doing the work, not a shadow.
- **Paper White** (`#ffffff`): primary text.
- **Warm Grey** (`#9a9a9f`): muted/secondary text — labels, captions, placeholders.

### Status (four roles only)
- **Slate Outline — new** (`#a8a8ad` text / `#34343a` border, no fill): a brand-new lead or appointment. Deliberately unfilled so it never reads as urgent or as cancelled.
- **Accent Ink — wait** (`#d4d4d8` / soft `rgba(244,244,245,0.20)`): anything awaiting a decision — price offer, payment, confirmation. Rides the accent on purpose, so "waiting on us" always looks like the brand's own color, in both modes.
- **Signal Green — done** (`#5fcf8e` / soft `rgba(95,207,142,0.14)`): confirmed, paid, completed. The only saturated hue that means something purely positive.
- **Slate Grey — dead** (`#a8a8ad` / soft `rgba(154,154,159,0.14)`, filled): lost, cancelled, expired. Same grey family as "new," but filled — so a dead lead is visually distinct from a brand-new one at a glance, never confused.

### Reserved for actions
- **Warm Coral Red — destructive** (`#f97066`): destructive *actions* only (delete, cancel). Never a passive state.
- **Amber Warning** (`#e0a145`): warnings that need attention but aren't failures.

### Categorical: artist identity
Eight-color ramp (`#eb9077` … `#c78d5b`, warm terracottas through cool blues) used only to tell artists apart on the calendar and in avatars. Never reused for status — mixing a categorical ramp into the semantic status roles is exactly the "eleven ad-hoc hues" problem this system replaced.

### Named Rules
**The Monochrome Accent Rule.** The brand accent is never a hue — it's a lightness relationship (near-white in dark mode, near-black in light). If a screen needs a second color to feel finished, reach for a status role, not a new accent.

**The Four-Roles Rule.** Every status in the product collapses onto new / wait / done / dead. A fifth ad-hoc status color is a sign the state doesn't belong in `conversations.state` or `projects.stage` at all — it belongs in one of the four.

### Light mode (fully specified, secondary identity)
Same structure, inverted values: bg `#f3f5f9`, surface `#ffffff`, surface-2 `#e9edf4`, border `#e0e5ee`, text `#12151c`, muted `#626b7d`, accent-fill `#18181b`, on-accent `#ffffff`, status-done `#2e7d4f`, destructive `#b42318`, warning `#b25e09`. The artist ramp uses deeper, less saturated tones of the same eight hues.

## 3. Typography

**Display Font:** Assistant (with ui-sans-serif, system-ui fallback) — currently a stand-in for a titling face not yet licensed; swapping it is a one-line token change.
**Body Font:** Open Sans, falling back to Assistant, then system-ui — aliased everywhere in the codebase as `font-assistant` (historical name, ~140 call sites; kept resolving on purpose rather than renamed).

**Character:** Quiet and functional — one working sans for nearly everything, with the display face reserved for the few headings that need to command attention (page titles, onboarding questions). No decorative pairing; the contrast is weight, not typeface.

### Hierarchy
- **Display** (800, 29px, 1.2 line-height, tight tracking): onboarding step questions, the single biggest text in the app — used once per screen, never for body headings.
- **Headline** (800, 23px, 1.25): page titles (`.page-head h1`) — one per screen, e.g. "לידים ופרויקטים."
- **Title** (700, 17px, 1.45): card and dialog headings, section titles.
- **Body** (500, 15px, 1.5): default UI text. Line length is not a concern here — this is dense app UI, not prose.
- **Label** (700, 12.5px, uppercase tracking on pills): stat labels, pill/badge text, table headers.

A separate **micro/mini** pair (12px/13px) exists only for touch-target legibility on phones — Hebrew has no ascender/descender cues, so body text below ~12px is unreadable on a phone screen. These collapse to a smaller desktop-only size (10px/11px) at the `lg` breakpoint, where density is expected. This is the one place the type scale is deliberately *larger* on mobile than desktop.

### Named Rules
**The One Working Sans Rule.** One sans family carries headings, labels, body and data. A second typeface is reserved for the display role only, and only for the one or two headings per screen that need it — never for body or buttons.

## 4. Elevation

Flat by default. A 1px border (`#2a2a2d` dark / `#e0e5ee` light) does the work that a shadow would do elsewhere; this system uses shadow only for things that are genuinely floating above the page.

### Shadow Vocabulary
- **Raised** (`0 1px 3px 0 rgb(16 24 40 / 0.06), 0 1px 2px -1px rgb(16 24 40 / 0.04)`): the default card/button shadow — barely perceptible, just enough to separate a surface from the page behind it.
- **Overlay** (`0 12px 32px -8px rgb(16 24 40 / 0.14)`): dialogs, sheets, dropdowns, toasts — anything that sits above the rest of the interface and needs to read as detached from it.

Only two roles exist; Tailwind's `sm` through `2xl` shadow scale all collapse onto one of these two so nothing in the app can invent a third depth.

### Named Rules
**The Two-Elevation Rule.** A surface is either flat (border only), raised, or an overlay. There is no fourth option — if something needs more separation than "raised," it belongs in an overlay (dialog/sheet), not a bigger shadow.

## 5. Components

### Buttons
- **Shape:** control radius (10px).
- **Primary:** accent-fill background, on-accent text, 56px tall on mobile / 48px on desktop, full-width on mobile — the only filled surface on most screens.
- **Ghost/Secondary:** surface-2 background, foreground text, same shape and sizing as primary.
- **Hover/Focus:** `active:scale-[0.97]` on press (not hover — this is a touch-first app), a 4px focus ring at 25% opacity of the accent. 180ms ease-out-quint transitions throughout (`cubic-bezier(0.16, 1, 0.3, 1)`), never a bounce or spring.

### Pills (status chips)
- **Style:** fully rounded (`pill` radius), 12.5px bold label text, no border — color comes from a status-role background tint (`*-soft`) with the matching text color, never a raw hex.
- **State:** one pill per record showing its current status role; never two pills stacked for one status.

### Cards / Containers
- **Corner Style:** card radius (12px).
- **Background:** surface color, 1px border, `raised` shadow.
- **Named Rule — The One Card Rule.** There is exactly one card treatment (`.card-native`) and it is never nested inside another card. A "card inside a card" is always a sign the inner content should be a plain row (`.row-native`) instead.

### Inputs / Fields
- **Style:** surface background, 1px border, control radius, 48px tall on mobile (16px minimum font size to stop iOS Safari's zoom-on-focus) / 44px on desktop.
- **Focus:** border shifts to the accent ring color plus a 4px ring at 15% opacity — no glow, no color change beyond the ring.

### Navigation
- **Desktop:** a fixed 288px (`w-72`) sidebar; the active item gets a 10%-opacity accent background and extra-bold text, inactive items are muted-foreground.
- **Mobile:** a fixed bottom tab bar (64px) for primary destinations, plus a right-side sheet drawer for secondary items (notifications, settings, AI status, logout) — deliberately two separate mechanisms, not one sidebar squeezed into a sheet.
- **Typography, states:** same label scale as elsewhere; active state is the only visual differentiator (no underline, no separate icon style).

### Signature component: the HITL action row
A bordered row (`.hitl-row` / `.hitl-row-success`) that sits inside a conversation thread to surface a bot decision awaiting staff confirmation (a quote, a slot, a receipt, a final booking) — accent border by default, success-colored border once approved. This is the one place in the system a border alone carries a full semantic state, and it exists because it's the crux of the product: a human approving what the AI proposed.

## 6. Do's and Don'ts

### Do:
- **Do** use exactly one accent (monochrome, near-white/near-black) and reserve saturated color for the four status roles and the destructive/success/warning trio.
- **Do** keep every screen flat by default (border only) and reach for `raised` or `overlay` only when something is genuinely separated from the page.
- **Do** answer one question per screen — if a page needs a sentence-and-a-half to describe what it shows, it's combining two screens (the reason Leads and Projects are being split into separate pages).
- **Do** use logical CSS properties (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`) everywhere; this is an RTL-Hebrew-first product, not an LTR product with RTL bolted on.

### Don't:
- **Don't** introduce a "safe" cream/sand background or any warm-neutral body color chosen by default rather than by brand — this system's neutral is charcoal, not paper.
- **Don't** ship a recycled hero-metric KPI row (big number / small label / gradient accent) or an identical card grid — the generic SaaS look this system explicitly rejects.
- **Don't** nest a card inside a card. Ever. Use a plain row instead.
- **Don't** invent a fifth status color. If new/wait/done/dead doesn't cover it, the state belongs somewhere else in the data model, not in a new hex value.
- **Don't** copy Pencild.co's light, card-heavy register or the glassmorphism-by-default look of the Poli-International/studio-crm reference — both were studied for feature ideas, neither for visual language.
- **Don't** add a shadow deeper than `overlay` or a radius rounder than `card` (12px) anywhere in the product.
