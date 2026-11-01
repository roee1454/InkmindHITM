Inkmind is a tattoo studio's CRM: bookings, WhatsApp conversations, projects and payments, used all day by artists and studio managers on phones and desktops. The interface is **Hebrew-first, monochrome, and quiet** — ink on canvas — so the few colours it does use (a status, an artist) carry meaning instantly. Every shared component is an `IM*` component (IM = Inkmind); features compose them and never restyle them.

## Content fundamentals

- **Hebrew, right-to-left, always.** Root is `dir="rtl"`. Layout uses logical sides only: `ms-/me-`, `ps-/pe-`, `start/end`, `text-start`. Never `left/right`.
- **Gender-inclusive where a person is addressed or described:** "מקעקע/ת", "לקוח/ה", "לא הגיע/ה". Prompts to the user use plural imperative or infinitive: "נסו לשנות את הסינון", "בחירת מקעקע/ת".
- **Buttons are verbs, menu items are verb + object:** "שמירה", "שליחה ב-WhatsApp", "מחיקת לקוח", "העתקת מספר טלפון". Avoid "אישור" when a real verb exists.
- **Outcomes in past tense, errors with a fix:** "הפרטים נשמרו" · "טעינת הכרטיס נכשלה." · "המחיר צריך להיות מספר חיובי." No apologies, no exclamation marks.
- **Numbers stay Latin and LTR inside Hebrew:** `₪1,200`, `13:00–16:00`, `052-705-1611`. Render them with the `numeric` text modifier (tabular, bidi-isolated).
- **Dates in words, times in digits:** "יום ד׳, 14 באוקטובר" · "11:00".
- **No emoji in the UI.** Meaning comes from icons and status roles.

## Colour

- The palette is **monochrome**. Ground `background`, surfaces `card`, recessed fills `surface-2`, separators `border`, text `foreground` and `muted-foreground`.
- **The filled control is `primary`** (near-black in light, near-white in dark) with `primary-foreground` on it. It is the only "brand colour"; there is no decorative accent hue.
- **Status is four roles, not hues:** `status-new` (outline, never filled) · `status-wait` (rides the monochrome accent) · `status-done` (green) · `status-dead` (filled grey). Plus `warning` for "needs attention soon" and `destructive` for destructive actions and failures. **No passive state is red.**
- **`artist-1…8` names a person** — calendar blocks, avatar rings, chart series. It never means a state and never collapses into a status colour.
- `success` / `warning` / `destructive` are tones for text and icons that report a system outcome — never decoration.
- Features never name a colour: no raw Tailwind palette (`emerald-500`, `zinc-400`), no hex. Lint blocks both.

## Typography

Two faces, nine roles. **Assistant 800** for the two display roles only (`display` 28, `headline` 23). **Open Sans** for everything else: `title` 17/700, `subtitle` 15/600, `body` 15/500, `body-sm` 13.5/500, `label` 13.5/700, `caption` 12.5/500, `micro` 11/600 (12 on touch). Text is set through `IMHeading` / `IMText` and their shortcuts — features don't write `text-sm font-bold`. No uppercase and no letter-spacing on Hebrew. Details and the role table: the **IMText** card.

## Spacing and layout

- 4px base. Page gutter `space-4` (16) on phones, `space-10` (40) from 1024px. Card padding `space-6` (24). Rows `space-3` × `space-4`.
- Lay out siblings with `gap`, not margins.
- **One raised surface per level:** a card never sits inside a card. Inside a card, group with spacing, a `border` hairline or a `surface-2` block.
- Phones get a top bar and a bottom nav; desktop a sidebar. Content width is fluid; forms and dialogs cap around 440px.

## Shape and depth

- Radius by role: `radius-inset` 8 (inside things: menu items, tab triggers, calendar days, checkbox) · `radius-control` 10 (buttons, inputs, selects, tab rail) · `radius-card` 12 (cards, dialogs, sheets, popovers, toasts) · `radius-pill` (badges, switch, avatar). An inset element is one step tighter than its container.
- Two elevations: `shadow-raised` for cards, inputs, outline buttons and the active tab; `shadow-overlay` for anything floating. Default is flat with a 1px `border`.

## Interaction and motion

- Touch first: every target is at least 44px (`control-md`); controls are 48px on touch, 44 on desktop. Inputs are 16px on touch so iOS never zooms.
- Press feedback is a `scale(0.97)` on active — hover styles don't exist on touch. Focus is a 4px `ring` halo, always visible on keyboard focus.
- Durations 120 / 180 / 280ms on `cubic-bezier(0.16, 1, 0.3, 1)`. Everything respects `prefers-reduced-motion`.
- **Every data view has four states:** loading (`IMSkeleton` in the content's shape — never "טוען…"), empty (`IMEmptyState`), error (inline message with a retry), and the content itself.

## Iconography

- **Phosphor icons, filled.** Every glyph with an interior uses the `fill` weight; pure strokes (`check`, `close`, `plus`, arrows, `link`, `attach`, `more`, `menu`, `spinner`) use `bold` — Phosphor's `fill` boxes those into a square. Carets are solid triangles.
- Icons come only from the closed registry: `<IMIcon name="calendar" size="sm" tone="muted" />`. Names say what the icon *means* (`edit`, `send`, `close`), and the registry decides glyph, weight and RTL mirroring. Nothing else imports `@phosphor-icons/react`.
- Sizes `xs 12 · sm 16 · md 20 · lg 24 · xl 32`; tones as for text plus `artist-N`. Default tone is `inherit`, so an icon in a button takes the button's colour.
- Directional glyphs (`arrow-back`, `chevron-start/end`, `send`, `reply`, `undo/redo`, `external-link`, `sidebar`, `logout`, `trend-up`) are mirrored in RTL by the registry. The full set: the **IMIcon** card and `assets/Registry/icon-registry.json`.

## Components

- Every export of `src/components/ui` is `IM`-prefixed: components (`IMButton`, `IMCardHeader`), hooks (`useIMToast`), props types (`IMButtonProps`). There are no unprefixed aliases.
- Shared vocabulary on every component: `variant` (visual style) · `size` (`sm · md · lg`) · `tone` (`default · muted · accent · success · warning · destructive · inherit`).
- Inventory: **Foundations** `IMText`, `IMIcon` · **Actions** `IMButton` · **Status** `IMBadge`, `IMStatusLabel` · **Surfaces** `IMCard` (+ `IMListRow`), `IMAvatar` · **Forms** `IMInput` (+ `IMTextarea`, `IMLabel`, `IMField`), `IMSelect` (+ `IMSelectInput`), `IMCheckbox`, `IMSwitch`, `IMSearchInput`, `IMDatePicker` (+ `IMHourPicker`, `IMCalendar`) · **Navigation** `IMTabs`, `IMPagination` · **Overlays** `IMDropdownMenu` (+ `IMPopover`), `IMDialog` (+ `IMResponsiveDialog`, `IMConfirmDialog`), `IMSheet` · **Feedback** `IMToast`, `IMSkeleton`, `IMEmptyState` · **Data** `IMChart`.
- Features never write raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<h1>`–`<h6>`, raw palette colours, arbitrary px sizes or radii, or import `radix-ui` / `@phosphor-icons/react`. Lint enforces each.
- **ScreenCustomers** shows a full screen assembled only from these parts.
