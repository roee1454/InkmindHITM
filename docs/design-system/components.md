# Components

Every shared component lives in `src/components/ui/`, one primitive per file, and every export is `IM`-prefixed: components (`IMButton`, `IMCardHeader`), hooks (`useIMToast`), props types (`IMButtonProps`) and the few helpers (`imPaginationPages`; `imControlClasses`, `imControlHeight`, `imControlText` and `imPickerTriggerClasses`, which keep every entry control on one surface). Features compose these parts and don't restyle them. Approved spec, with live renditions: [`im-design-system/spec/components/`](../im-design-system/spec/README.md). Lint: `eslint/design-system/components.js`.

## Import convention

One file per primitive, imported by its own path — no barrel, no `#/` alias, no extension:

```tsx
import { IMButton } from '@/components/ui/button'
import { IMCard, IMCardContent, IMListRow } from '@/components/ui/card'
```

Why per file: it is what ~380 call sites already did; a barrel's `export *` hid name collisions (`Calendar` the component vs `Calendar` the legacy glyph) and pulled every primitive into every module graph. Lint flags `@/components/ui`, `#/components/ui/…` and `…/button.tsx`.

## Shared vocabulary

- `variant` — visual style (`primary`, `outline`, `flush`, `subtle`…).
- `size` — `sm · md · lg`, plus `icon` / `icon-sm` on IMButton. `md` is always the default.
- `tone` — `default · muted · accent · success · warning · destructive · inherit`, from `src/components/ui/tones.ts`. Text and icons only; components pick tones for you.
- Radius by role: controls (buttons, inputs, select/date/hour triggers, search, tab rail, chips) `rounded-lg` 10 · inset parts (menu and select items, tab triggers, calendar days, checkbox, page chips) `rounded-md` 8 · surfaces (card, dialog, sheet, popover, menus, toast) `rounded-xl` 12 · badges, switch, avatar `rounded-full`.
- Controls are 44px on desktop and 48px on touch; nothing tappable is under 40. The height and the input text size go through CSS variables (`--im-control-h`, `--im-control-fs`) that only the `pointer-coarse` query changes, so a call site's plain `h-9` or `text-sm` replaces the default on every device instead of losing to a media-query class.
- Every title in a card, dialog or sheet is the `title` text role (17/700); descriptions are `body-sm` muted.

## Pick the right overlay

| You need… | Use | Not |
|---|---|---|
| A short form or a focused task that blocks the page | `IMResponsiveDialog` — centred on desktop, a bottom sheet on phones | `IMDialog` (the primitive behind it; lint keeps it out of features) |
| "Are you sure?" before something that can't be undone | `IMConfirmDialog` (or `useConfirm()` for a promise-style ask) | a hand-built dialog with a warning box |
| A detail view or a long form that keeps the page in context | `IMSheet` (`side="bottom"` on phones, a side on desktop) | a dialog that scrolls the page behind it; a sheet that opens another sheet |
| Actions on one thing, from a `more` button | `IMDropdownMenu` | a popover of buttons |
| Pick one of a short known list | `IMSelect` | a dropdown menu of choices |
| Free-form floating content anchored to a trigger (a picker, a filter panel) | `IMPopover` | a dialog |
| Report something that just happened | `useIMToast()` | a dialog; a toast for something the user must act on |

## Pick the right choice control

| You need… | Use |
|---|---|
| Up to five views of the same data, switched in place | `IMTabs` (works without `IMTabsContent`, as a segmented control) |
| More than five options, or toggleable filters / presets in a wrapping row | `IMChip` |
| One of up to ~12 values in a form | `IMSelect` |
| A long numeric range on a phone | `IMSelectInput` (native `<select>`) |
| A setting that applies at once | `IMSwitch` |
| A yes/no submitted with a form | `IMCheckbox` |

---

## Actions

### IMButton — `button.tsx`
Every clickable action, from a full-width CTA to an icon-only toolbar control.
- **Use** for any action. One `primary` per view or dialog; a second action is `outline` or `secondary`; `ghost` for toolbar and row actions on a surface; `link` inside text; `destructive` only for the action that destroys (the confirm button of a delete dialog).
- **Not** for a toggleable option (`IMChip`), a whole pressable row (`IMListRow asChild`), or a link that looks like text in a paragraph without an action (`<Link>`).
- **Props**: `variant` `primary` (default) · `secondary` · `outline` · `ghost` · `destructive` · `link`. `size` `sm` 40 · `md` 44/48 (default) · `lg` 56, full width (auth, onboarding, sheet footers only) · `icon` 44 square · `icon-sm` 40 square. Icon-only sizes need an `aria-label`. `loading` — spinner in the leading slot + disabled + `aria-busy`; pass the in-progress verb as the label ("שומר…"); on `icon` sizes the spinner replaces the glyph so the square holds. `asChild` — style a router `<Link>`.
- **Copy**: a verb that says what happens ("שמירה", "שליחה ב-WhatsApp", "מחיקת לקוח"), never "אישור" when a real verb exists.
- **Replaces**: `Button`, `buttonVariants`, `.btn-native`, `.btn-native-ghost`, `.tap-target`, raw `<button>`.

### IMChip — `chip.tsx`
One choice in a row of toggleable options: filter chips, quick presets, deposit amounts.
- **Use** when the options wrap or scroll, there are more than five, or several can be on.
- **Not** for up to five views of the same data (`IMTabs`), a state label (`IMBadge`), or an action (`IMButton`).
- **Props**: `selected` (renders `aria-pressed`; fills with `primary`), `count`. 40px, `rounded-lg`. Lay out a group with `flex flex-wrap gap-2`.
- **Replaces**: hand-rolled toggle chips in projects, analytics, onboarding, invite, conversations and `WeeklyHoursEditor`.

## Status

### IMBadge — `badge.tsx`
A pill that names a state or a category in one or two words.
- **Use** where the state is the headline (a project header, a payment status).
- **Not** in dense lists — a column of pills is louder than the data (`IMStatusLabel`). Never nested inside another pill.
- **Props**: `variant` `new` (outline) · `wait` · `done` · `dead` (filled grey) · `muted` (default) · `outline` · `destructive` (failures only, never a passive state like "lost"). No colour props.
- **Replaces**: `Badge`, `.pill`, ad-hoc `rounded-full px-2 text-xs bg-…` chips.

### IMStatusLabel — `status-label.tsx`
A state in words: a dot in the role's colour and ordinary text.
- **Use** in list rows and cards. **Not** where the state is the headline (`IMBadge`).
- **Props**: `role` `new · wait · done · dead · warning · danger`; `children` one to three words.

## Surfaces

### IMCard (+ IMListRow) — `card.tsx`
The one raised surface: `IMCard` › `IMCardHeader` (`IMCardTitle`, `IMCardDescription`, `IMCardAction`) · `IMCardContent` · `IMCardFooter`.
- **Use** for a group of content on a page. Padding 24 (16 on phones); footer actions at the inline end, one primary at most.
- **Not** inside another card — inside a card, group with spacing, a `border` hairline or a `surface-2` block.
- **Props**: `variant="flush"` — the card is a list: the content drops its padding and stacks `IMListRow`s separated by hairlines.
- **IMListRow**: one row of a list — leading media, a `min-w-0 flex-1` text column, trailing meta. `asChild` renders your `<button>` / `<Link>` as the row and adds the pressed state.
- **Replaces**: `Card*`, `.card-native`, `.row-native`, hand-rolled `rounded-xl border bg-card` boxes and `border-t first:border-t-0 px-4 py-3` rows.

### IMAvatar — `avatar.tsx`
A person: their photo, else a two-letter monogram on `accent-soft`.
- **Props**: `name` (monogram + accessible name: first letters of the first and last word, or the first two of a one-word name), `src`, `size` `sm` 32 · `md` 42 (default) · `lg` 56, `artist` `1…8` (a ring in the artist's identity colour — customers never get one).
- **Interim**: `IMAvatarImage` / `IMAvatarFallback` children, for the three calendar artist pickers until Phase 2 moves them to `src` + `name`.
- **Replaces**: `Avatar*`, `.avatar-native`.

## Forms

### IMInput, IMTextarea, IMLabel — `input.tsx`, `textarea.tsx`, `label.tsx`
Text entry on the shared control surface (`imControlClasses`): 44/48 high, 15px on desktop and 16 on touch so iOS never zooms, focus = `primary` border + 4px halo, invalid = `destructive` border (set `aria-invalid`).
- Every input has a visible label; a placeholder is an example value, never the label.
- Phone, email, URL and money inputs are `dir="ltr"` with a bare example placeholder ("054-765-4321").
- **Replaces**: `Input`, `Textarea`, `Label`, `.field-native`, `.form-label`, raw `<input>` / `<textarea>`.

### IMField — `field.tsx`
Label + control + help or error, with the ids wired: the label points at the control, the control is described by whichever line shows, `aria-invalid` / `aria-required` follow `error` / `required`.
- **Use** for any field outside react-hook-form.
- **Not** inside react-hook-form (`IMFormItem` and parts).
- **Props**: `label`, `help`, `error` (replaces the help; say how to fix it), `required`, `id` (generated otherwise). The single child is the control — don't give it an `id` of its own.
```tsx
<IMField label="מספר טלפון" help="נשתמש בו ל-WhatsApp." error={errors.phone}>
  <IMInput dir="ltr" placeholder="054-765-4321" value={phone} onChange={…} />
</IMField>
```

### IMForm, IMFormField, IMFormItem, IMFormLabel, IMFormControl, IMFormDescription, IMFormMessage — `form.tsx`
The react-hook-form counterpart of IMField. `IMFormItem` lays out and wires the parts; `IMFormControl` slots the ids onto your control.

### IMSelect (+ IMSelectInput) — `select.tsx`, `select-input.tsx`
Pick one from a short, known list (up to ~12). The trigger looks exactly like IMInput; items are 44px; the selected one sits on `accent-soft` with a check at the inline end.
- **Parts**: `IMSelect`, `IMSelectTrigger` (`size` `md` · `sm` 40), `IMSelectValue` (placeholder says what to choose: "בחירת מקעקע/ת"), `IMSelectContent`, `IMSelectItem`, `IMSelectGroup`, `IMSelectLabel`, `IMSelectSeparator`.
- **IMSelectInput** — a native `<select>` with the same look, only where the OS picker is better: long numeric ranges on phones.
- **Not** for actions (`IMDropdownMenu`) or long searchable lists (a combobox — report it as a gap).
- **Replaces**: `Select*`, `SelectInput`, raw `<select>`.

### IMCheckbox, IMSwitch — `checkbox.tsx`, `switch.tsx`
- **IMCheckbox**: a yes/no submitted with a form (consent, multi-select). 24px, `rounded-md`. Wrap it and its text in one `<label>` so the whole line is the target.
- **IMSwitch**: a setting that takes effect at once — no save button. 50×30; pair it with a subtitle and a one-line muted explanation.

### IMSearchInput — `search-input.tsx`
A search field with a leading search icon and a clear button once it has a value. Debounced (300ms): `onChange` gets the settled value, `onImmediateChange` every keystroke.
- **Props**: `variant` `default` (on a page) · `subtle` (inside a toolbar or popover, no shadow); `size` `md` (default) · `sm` 38 (inside pickers and menus); `containerClassName`, `containerRef`.
- **Replaces**: `SearchInput`, `getSearchInputClasses`.

### IMDatePicker, IMHourPicker, IMCalendar — `date-picker.tsx`, `hour-picker.tsx`, `calendar.tsx`
Date and time entry. Triggers are styled as IMInput with a muted leading icon and a trailing chevron; dates read as words ("יום ד׳, 14 באוקטובר", the year only when it isn't this year); times are tabular.
- **IMDatePicker**: `value` / `onChange` as `YYYY-MM-DD`, `minDate`, `disabled` (boolean, or a per-day predicate).
- **IMHourPicker**: `value` / `onChange` as `HH:MM`, `step` (30), `min` / `max`, `hideIcon` for tight start–end pairs. The list filters as you type and groups by part of day.
- **IMCalendar**: the month grid on its own. The week starts on Sunday; today has a ring; the selected day is `primary`; arrow keys move by day and week in RTL.

## Navigation

### IMTabs — `tabs.tsx`
Switch between views of the same data, in place: `IMTabs` › `IMTabsList` › `IMTabsTrigger` (+ `IMTabsContent`). A `surface-2` rail (`rounded-lg`) with 38px triggers (`rounded-md`); the active one lifts to `card`. `count` on a trigger shows how many items the view holds.
- **Not** for more than five options (`IMChip` or `IMSelect`).

### IMPagination — `pagination.tsx`
Windowed pagination under a list: a range summary ("מציג 11–20 מתוך 57 לקוחות") at the start, previous / pages / next at the end; at most 7 page slots (`imPaginationPages`), collapsing to "2 / 7" on phones. Renders nothing for a single page.
- **Props**: `currentPage`, `totalPages`, `onPageChange`, `totalItems`, `itemsPerPage` (10), `itemLabel`.

## Overlays

### IMResponsiveDialog (+ IMDialogActions) — `responsive-dialog.tsx`
The dialog features use: centred on desktop, a bottom sheet on phones, with a fixed header, a body that scrolls on its own and a pinned action bar.
- **Props**: `open`, `onOpenChange`, `title` (a question or a task: "למחוק את התור?", "תור חדש"), `description` (the consequence), `footer`, `size` `sm` (a confirmation) · `md` (a short form, default) · `lg` (a wizard or a list) · `xl` (a work hub), `trigger`, `hideHeader`, `bare`.
- **IMDialogActions** lays the footer out: `children` packed at the inline end (cancel first, the primary last), an optional `start` action, and an `error` that takes the start slot.
- Facts the user is confirming go in a `surface-2` key/value block — not a nested card.

### IMConfirmDialog — `confirm-dialog.tsx`
The preset for "are you sure?": `title`, `description`, `details` (label/value lines in a `surface-2` block), `confirmLabel` (a specific verb, never "אישור"), `pendingLabel`, `variant` `primary` · `destructive` (only for what can't be taken back), `isPending`, `error`. `useConfirm()` (`src/hooks/useConfirm.tsx`) wraps it in a promise.

### IMDialog — `dialog.tsx`
The Radix dialog primitive (`IMDialog`, `IMDialogTrigger`, `IMDialogContent`, `IMDialogHeader`, `IMDialogTitle`, `IMDialogDescription`) behind the two above, plus `IMOverlayClose`, the inline-end close button shared with IMSheet. Lint keeps it out of features.

### IMSheet — `sheet.tsx`
A panel that slides in from an edge, for a detail view or a long form that keeps the page in context: `IMSheet` › `IMSheetTrigger`, `IMSheetContent` (`side` `bottom` (default, with a drag handle) · `left` (the inline end in RTL) · `right` · `top`; `showCloseButton`), `IMSheetHeader`, `IMSheetTitle`, `IMSheetDescription`, `IMSheetFooter`.
- One sheet at a time — a sheet never opens another sheet; use a dialog.

### IMDropdownMenu — `dropdown-menu.tsx`
Actions on one thing, opened from a `more` button: `IMDropdownMenu` › `IMDropdownMenuTrigger`, `IMDropdownMenuContent`, `IMDropdownMenuItem` (`variant` `default` · `destructive`, `inset`), `IMDropdownMenuLabel`, `IMDropdownMenuSeparator`, `IMDropdownMenuShortcut`, `IMDropdownMenuSub` / `SubTrigger` / `SubContent`.
- Items are 44px with a muted sm icon at the start and a verb + object label ("מחיקת לקוח"). The destructive item goes last, after a separator, and opens a confirm dialog rather than acting.

### IMPopover — `popover.tsx`
Free-form floating content anchored to a trigger: `IMPopover` › `IMPopoverTrigger`, `IMPopoverContent` (`card`, `shadow-overlay`, `rounded-xl`).

## Feedback

### IMToast — `toast.tsx`
`IMToastProvider` is mounted once at the root; `useIMToast().toast(title, message, type?, duration?, onClick?)` reports something that just happened. `type` (`info` · `success` · `warning` · `error`) sets the leading icon only; the surface stays `card`. Title in past tense for outcomes ("הפרטים נשמרו"); errors say what failed and what to do. Never for something the user must act on.

### IMSkeleton — `skeleton.tsx`
The loading state: `surface-2` blocks in the exact shape of the content (avatar circle, two text lines, trailing meta), so nothing jumps when data lands. Never "טוען…" as text, never a spinner in place of a list. The pulse stops under reduced motion.

## Data

### IMChart — `chart.tsx`
Recharts inside `IMChartContainer` (with an `IMChartConfig`), plus `IMChartTooltip` / `IMChartTooltipContent` and `IMChartLegend` / `IMChartLegendContent`. Series colours come from the config, never inline: people use the artist ramp, categories `chart-1…5`. The tooltip is a small `card` with `shadow-overlay` and tabular values.

---

## Superseded component classes

These `@layer components` classes in `src/styles.css` are replaced by the primitives above. Lint (`[ds:components]`) flags every use; Phase 2 migrates the callers and Phase 3 deletes the classes.

| Class | Use instead |
|---|---|
| `.btn-native` | `IMButton size="lg"` |
| `.btn-native-ghost` | `IMButton variant="secondary" size="lg"` |
| `.tap-target` | `IMButton variant="ghost" size="icon"` + `aria-label` |
| `.card-native` | `IMCard` |
| `.row-native` | `IMListRow` |
| `.field-native` | `IMInput` / `IMField` |
| `.pill` | `IMBadge` (a state) or `IMChip` (a choice) |
| `.avatar-native` | `IMAvatar` |

## Lint rules (`[ds:components]`)

Outside `src/components/ui/`: no raw `<button>`, `<input>` (a hidden `type="file"` picker is fine), `<select>` or `<textarea>`; no `radix-ui` / `@radix-ui/*` imports; no `@/components/ui/dialog` import. Everywhere: the import convention above, and the superseded classes.

## Not here yet

- `icon` / `iconEnd` on IMButton, IMBadge and IMTabsTrigger, and `IMIcon` inside the primitives — Phase 1b, once `IMIcon name=` lands. Until then pass a glyph as a child; it takes the size that matches the button.
- `IMEmptyState` — Phase 1b.
