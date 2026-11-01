# Typography

Two faces, nine roles, one ladder. Every piece of text in the app is one role, set through
`IMHeading` / `IMText` and their shortcuts in `src/components/ui/typography.tsx`. Features don't
write `text-sm font-bold`: they pick a role. If no role fits, the role set is wrong, so raise it
instead of inventing a size.

## The two faces

| Face | Token | Roles | Why |
|---|---|---|---|
| **Assistant 800** | `--font-display` (`font-display`) | `display`, `headline` | A Hebrew-native face with a heavy, compact 800 cut. It gives the one figure or page title per screen a voice of its own. It is kept to 23px and up, where that weight stays open; at interface sizes it clogs. |
| **Open Sans** | `--font-body`, inherited from `<body>` | everything else | Even Hebrew and Latin colour, tabular digits, and every weight from 400 to 800. It reads at 11–17px on a phone. |

Only `IMDisplay` / `IMHeadline` (and `IMHeading variant="display|headline"`) set `font-display`.
Nothing sets `font-body`: it is the inherited default. Google Fonts loads Assistant **800** only
and Open Sans **400–800**. 400 is still the weight of unstyled text, and 800 is used by avatar
monograms and active tabs.

`font-assistant` is a legacy alias of the **body** font: it never rendered Assistant. Phase 2
deletes its call sites, and plan item 3.2 deletes the alias.

## Roles

| Role | Component | Face | Size / line | Weight | Ladder step | Use for |
|---|---|---|---|---|---|---|
| display | `IMDisplay` | Assistant | 28 / 1.2 | 800 | `text-3xl` | One hero figure or question per screen: dashboard total, onboarding question |
| headline | `IMHeadline` | Assistant | 23 / 1.25 | 800 | `text-2xl` | The page title; full-screen sheet and drawer titles |
| title | `IMTitle` | Open Sans | 17 / 1.45 | 700 | `text-lg` | Card headers, section titles, dialog and sheet titles |
| subtitle | `IMSubtitle` | Open Sans | 15 / 1.5 | 600 | `text-base` | Sub-sections, a row's primary line (a customer's name) |
| body | `IMText` | Open Sans | 15 / 1.5 | 500 | `text-base` | Running text, notes, chat bubbles |
| body-sm | `IMText variant="body-sm"` | Open Sans | 13.5 / 1.4 | 500 | `text-sm` | Descriptions, a row's second line, help text |
| label | `IMLabel` (form) · `IMText variant="label"` | Open Sans | 13.5 / 1.4 | 700 | `text-sm` | Form labels, key/value keys, captions of switches and checkboxes |
| caption | `IMCaption` | Open Sans | 12.5 / 1.3 | 500 | `text-xs` | Timestamps, footnotes, meta lines |
| micro | `IMText variant="micro"` | Open Sans | 11 / 1.25 (12 on touch) | 600 | `text-2xs` | Nav counters, dense calendar chips |

Display and headline also get `text-balance`. No role sets `leading-*` (the step carries the
line-height), `tracking-*`, or a breakpoint size: a role is the same size at every width.

### The ladder (`@theme` in `src/styles.css`)

| Step | Size | Line | Role(s) |
|---|---|---|---|
| `text-2xs` | 11px (12px under `@media (pointer: coarse)`) | 1.25 | micro |
| `text-xs` | 12.5px | 1.3 | caption |
| `text-sm` | 13.5px | 1.4 | body-sm, label |
| `text-base` | 15px | 1.5 | body, subtitle |
| `text-lg` | 17px | 1.45 | title |
| `text-xl` | 20px | 1.3 | **none.** It stays only for its current call sites, which the migration table moves to `headline` |
| `text-2xl` | 23px | 1.25 | headline |
| `text-3xl` | 28px | 1.2 | display |
| `text-micro` | = `text-2xs` | | interim alias, Phase 3 |
| `text-mini` | = `text-xs` | | interim alias, Phase 3 |

The steps keep Tailwind's t-shirt names on purpose. `cn()` runs tailwind-merge, which only
recognises t-shirt names as font sizes. It reads a custom name like `text-micro` as a colour, so
`cn('text-micro', 'text-muted-foreground')` silently drops the size. That is why the old
`micro` role never rendered at its size, and why `text-micro` / `text-mini` are aliases now.

## API (`src/components/ui/typography.tsx`)

| Export | What |
|---|---|
| `IMHeading` | `variant`: `display · headline · title · subtitle` (default `title`) · `as`: `h1–h6 · p · span · div` · `tone` |
| `IMDisplay`, `IMHeadline`, `IMTitle`, `IMSubtitle` | `IMHeading` with the variant fixed. Default elements are `h1 · h1 · h2 · h3`; `as` sets the outline level |
| `IMText` | `variant`: `body · body-sm · label · caption · micro` (default `body`) · `tone` · `weight` · `numeric` · `as`: `p` (default) `· div · li · dt · dd · span · strong · em · small` |
| `IMCaption` | `IMText variant="caption"`, tone `muted` by default |
| `IMNum` | Inline numeric run inside any role: `<IMNum>₪1,200</IMNum>` |
| `IM_TYPE_ROLES` | Role → class string, for primitives that can't wrap `IMText` (`IMLabel`, Radix dialog/sheet titles) |
| Types | `IMHeadingProps`, `IMHeadingShortcutProps`, `IMHeadingVariant`, `IMHeadingElement`, `IMTextProps`, `IMTextVariant`, `IMTextWeight`, `IMTextBlockElement`, `IMTextInlineElement`, `IMCaptionProps`, `IMNumProps`, `IMTypeRole` |

- **`as` is the semantics, `variant` is the look.** `<IMTitle as="h3">` inside a section whose
  heading is already an `h2`; `<IMDisplay as="p">` for a hero figure that isn't the page heading.
- **`weight`** (`medium · semibold · bold`) is emphasis inside body text only, never a way to fake
  another role. An emphasised run inside a sentence is `<strong>`.
- Neither component takes `dir` (see the numeric rule). `IMText` can't render a `<label>`: form
  labels are `IMLabel` in `label.tsx`, which uses `IM_TYPE_ROLES.label`.
- `IMText` defaults to `<p>`. Inside a `<button>`, `<a>`, `<label>` or another text element, use
  `as="span"`, because a `<p>` there is invalid HTML.
- Alignment is inherited (`text-align: start` is the CSS default), so a centred empty state or
  auth screen stays centred. Override on the element with `text-center` / `text-start` / `text-end`.

## Tones

`tone` comes from `src/components/ui/tones.ts`, the vocabulary text shares with icons and badges.

| Tone | Class | Use |
|---|---|---|
| `default` | `text-foreground` | Default for `IMText` and `IMHeading` |
| `muted` | `text-muted-foreground` | Secondary text. Default for `IMCaption` |
| `accent` | `text-accent-ink` | The monochrome accent (links, the active item) |
| `success` · `warning` · `destructive` | `text-success` · `text-warning` · `text-destructive` | **System outcomes only**: saved, needs attention, failed. Never decoration |
| `inherit` | `text-inherit` | Text on a filled surface (primary bubble, filled badge) whose parent sets the ink |

No tone maps to a raw palette class.

## The numeric rule

Numbers stay Latin and LTR inside Hebrew: `₪1,200`, `13:00–16:00`, `052-705-1611`, `14/10`.
Without isolation, the bidi algorithm reorders the neutral characters, so `13:00–16:00` renders
as `16:00–13:00` in an RTL line.

- **A run inside other text** → `<IMNum>`. It keeps the surrounding role (size, weight, tone) and
  adds `tabular-nums` and `dir="ltr"`. On an inline element, `dir` implies
  `unicode-bidi: isolate`.
  `<IMText variant="body-sm" tone="muted"><IMNum>132</IMNum> לקוחות</IMText>`
- **The whole element is the number** → `numeric`: `<IMCaption numeric>13:00–16:00</IMCaption>`.
  `numeric` renders a `<span>` and only accepts inline elements in `as`. `<IMText numeric as="p">`
  is a type error, so a paragraph can't become `dir="ltr"` by accident (block-level `ltr` flips
  its alignment and punctuation).
- The same applies to other Latin runs: email, URL, file name, WhatsApp number. `tabular-nums`
  only affects digits.
- Inputs are not text: an LTR field (`IMInput dir="ltr"`) stays as it is.

## Hebrew rules

1. **No case transforms.** Hebrew has no letter case, so `uppercase`, `lowercase` and
   `capitalize` do nothing to it and mangle the Latin around it.
2. **No letter-spacing.** `tracking-*` breaks Hebrew letterforms and word shapes. The roles set
   none, including display and headline. The spec's `-0.01em` display tracking is not applied:
   the brand book's "no letter-spacing on Hebrew" wins.
3. **Line-heights leave room for Hebrew.** Lamed rises above the other letters, the final forms
   (ך ן ף ץ) and ק drop below the baseline, and nikud sits under the line. Small roles get
   1.3–1.4, running text 1.5, display 1.2. Don't override them with `leading-*`.
4. **Logical alignment only.** `text-start` / `text-end`, never `text-left` / `text-right`.
5. **12px is the floor on touch.** Below it, Hebrew in Open Sans can't be read on a phone, so
   `micro` rises from 11px to 12px under `pointer: coarse`.

## Migration table (Phase 2)

Phase 2 agents apply this **literally**. It turns today's class strings into roles in four steps.
The table after them lists the 30 most frequent combinations in `src/features` + `src/components`
with the four steps already applied. Ignore class order. Layout classes (`flex`, `gap-*`, `truncate`,
`line-clamp-*`, `text-center`, `text-balance`, padding, margin) move to `className` unchanged.

### Step 0: delete

| Delete | Why |
|---|---|
| `font-assistant` on any element | Alias of the body font. Deleting it changes nothing on screen |
| `leading-*`, `tracking-*`, `uppercase` on text that becomes a role | The role carries its line-height and sets no tracking or case |
| Breakpoint sizes (`md:text-base`, `lg:text-2xl`, `sm:text-3xl`, `xl:text-4xl`, `md:text-[15px]`) | A role is one size at every width |
| `tabular-nums`, `dir="ltr"`, `dir-ltr` on a text element | Replaced by `numeric` / `IMNum` (`dir-ltr` isn't defined in CSS and does nothing today) |
| A size class on a container `<div>` that only sizes its children | Put the role on each text child instead |

### Step 1: element and content decide first

Take the first row that matches.

| # | When | Use |
|---|---|---|
| 1 | `<h1>`–`<h6>` (keep the level with `as`) | By size: `text-3xl`/`text-4xl`/`step-question`/`text-[29px]` → `IMDisplay` · `text-2xl`/`text-xl`/`auth-title`/`.page-head h1` → `IMHeadline` · `text-lg`/`text-base` → `IMTitle` · `text-sm`/`text-xs` → `IMSubtitle` |
| 2 | `<label>`, `<Label>`, `<FormLabel>`, `.form-label` on a label element | `IMLabel` (keep `htmlFor`; drop the text classes) |
| 3 | Text naming a control or a key, without a label element: a switch/checkbox caption, a `<dt>`, the key of a key/value row, `.form-label` on a `<span>` | `IMText variant="label"`, `as` = the original element |
| 4 | A timestamp, date or relative time at `text-xs` or smaller (`לפני 5 דק׳`, `14:30`, `12/10`) | `IMCaption` (+ `numeric` when it is only digits) |
| 5 | The element only holds a number, amount, phone, time range, email or URL | the role from step 2 + `numeric` |
| 6 | A number/phone/email run inside other text | wrap the run in `<IMNum>` |
| 7 | Weight but **no** size on a `<span>` inside other text (`font-bold text-foreground`) | `<strong>` for semibold/bold/extrabold. Keep a token colour only if it differs from the parent's (`<strong className="text-foreground">` inside muted text). `font-medium` / `font-normal` alone: delete the class |
| 8 | Weight but no size on a standalone line | take the size from the nearest ancestor that sets one, then step 2 |
| 9 | Radix titles and descriptions (`DialogTitle`, `SheetTitle`, `*Description`) and text inside `IMButton`, `IMBadge`, `IMInput` | Drop the text classes; the primitive owns its type |

### Step 2: role by size × weight

| Size class | none · `font-normal` · `font-medium` | `font-semibold` · `font-bold` · `font-extrabold` · `font-black` |
|---|---|---|
| `text-3xl`, `text-4xl`, `.step-question`, `text-[29px]` | `IMDisplay` | `IMDisplay` |
| `text-2xl`, `text-xl`, `.auth-title`, `text-[25px]` | `IMHeadline` | `IMHeadline` |
| `text-lg`, `text-[17px]` | `IMTitle` | `IMTitle` |
| `text-base`, `text-[15px]`, `text-[16px]`, `.auth-sub`, `.step-hint` | `IMText` (body) | `IMSubtitle` |
| `text-sm`, `text-[13px]`, `text-[14px]`, `.page-head p` | `IMText variant="body-sm"` | colour `text-foreground` or none → `IMSubtitle`; any other colour → `IMText variant="label"` |
| `text-xs`, `text-mini`, `text-[12px]`, `text-[12.5px]` | `IMCaption` | `IMText variant="label"` |
| `text-2xs`, `text-micro`, `text-[10px]`, `text-[11px]` | `IMText variant="micro"` | `IMText variant="micro"` |

Headings that are not `h1`–`h6` (row names, panel titles in a `<span>`) take `as="span"` / `as="p"`.
For every row, keep the original element: `<span>` → `as="span"`, `<div>` → `as="div"`,
`<p>` → the default.

### Step 3: tone by colour class

| Colour class (opacity suffixes like `/70` are dropped) | `tone` |
|---|---|
| `text-foreground`, `text-card-foreground`, `text-popover-foreground` | `default` (omit it, except on `IMCaption`, where you write `tone="default"`) |
| `text-muted-foreground`, `text-status-new`, `text-status-dead`, raw greys (`text-zinc-500 dark:text-zinc-400`) | `muted` (omit it on `IMCaption`) |
| `text-primary`, `text-accent-ink`, `text-accent-foreground`, `text-status-wait` | `accent` |
| `text-success`, `text-status-done`, raw greens | `success` |
| `text-warning`, raw ambers | `warning` |
| `text-destructive`, raw reds/roses | `destructive` |
| no colour class, `text-primary-foreground`, `text-white`, `text-destructive-foreground`, `text-inherit`, `text-current` | `inherit` (a filled parent owns the ink) |
| `text-artist-N` on text | report it as a gap: artist colours are for icons and blocks, not text |

### The 30 most frequent combinations, resolved

Counted over `className` strings in `src/features` and `src/components` on 2026-10-06: 871 strings
carry a size or weight, in 151 distinct combinations. These 30 cover about 71% of them. The
"Becomes" column is the result when step 1 doesn't match. A label element, a control caption or
a heading still goes through step 1 (rows 1–3), with its tone from step 3.

| # | Classes (any order) | Count | Becomes | Visual change |
|---|---|---:|---|---|
| 1 | `text-sm font-bold text-foreground` | 73 | `IMSubtitle as="span"` / `as="p"` | 13.5/700 → 15/600 |
| 2 | `text-xs text-muted-foreground` | 69 | `IMCaption` | weight 400 → 500 |
| 3 | `text-sm text-muted-foreground` | 58 | `IMText variant="body-sm" tone="muted"` | weight 400 → 500 |
| 4 | `form-label` | 42 | on a label element `IMLabel`; on a `<span>` `IMText as="span" variant="label"` | none |
| 5 | `text-xs` | 29 | `IMCaption tone="inherit"` | weight 400 → 500 |
| 6 | `font-bold text-foreground` (no size) | 29 | inside text: `<strong className="text-foreground">` (step 1 row 7); standalone: step 1 row 8 | none |
| 7 | `text-sm` | 24 | `IMText variant="body-sm" tone="inherit"` | weight 400 → 500 |
| 8 | `text-xs font-bold text-muted-foreground` | 22 | `IMText variant="label" tone="muted"` | 12.5 → 13.5px |
| 9 | `text-2xs text-muted-foreground` | 22 | `IMText variant="micro" tone="muted"` | weight 400 → 600; 12px on touch |
| 10 | `text-xs font-semibold text-foreground` | 21 | `IMText variant="label"` | 12.5/600 → 13.5/700 |
| 11 | `text-base` | 21 | `IMText tone="inherit"`; on `Input`, step 1 row 9 | weight 400 → 500 |
| 12 | `text-xs font-bold text-destructive` | 20 | `IMText variant="label" tone="destructive"` (field error) | 12.5 → 13.5px |
| 13 | `text-sm font-extrabold text-foreground` | 16 | `IMSubtitle as="span"` / `as="p"` | 13.5/800 → 15/600 |
| 14 | `text-sm font-bold text-muted-foreground` | 15 | `IMText variant="label" tone="muted"` | none |
| 15 | `text-sm font-bold text-destructive` | 14 | `IMText variant="label" tone="destructive"` | none |
| 16 | `text-3xl step-question` | 14 | `IMDisplay` (it is always an `<h1>`) | 29 → 28px, Open Sans → Assistant, no tracking |
| 17 | `step-hint` | 14 | `IMText tone="muted"` | line-height 1.625 → 1.5 |
| 18 | `text-xs font-bold text-foreground` | 13 | `IMText variant="label"` | 12.5 → 13.5px |
| 19 | `text-micro text-muted-foreground` | 12 | `IMText variant="micro" tone="muted"` | weight 400 → 600 |
| 20 | `text-sm font-semibold text-destructive` | 12 | `IMText variant="label" tone="destructive"` | weight 600 → 700 |
| 21 | `text-2xs font-medium text-muted-foreground` | 12 | `IMText variant="micro" tone="muted"` | weight 500 → 600 |
| 22 | `text-xs font-medium text-muted-foreground` | 10 | `IMCaption` | none |
| 23 | `text-2xs font-bold` | 9 | `IMText variant="micro" tone="inherit"` | weight 700 → 600 |
| 24 | `text-xs font-semibold text-muted-foreground` | 8 | `IMText variant="label" tone="muted"` | 12.5/600 → 13.5/700 |
| 25 | `text-base font-extrabold text-foreground` | 8 | `IMSubtitle as="span"`; on `<h2>`/`<h3>` (most of them) `IMTitle` | heading: 15/800 → 17/700 |
| 26 | `text-sm font-semibold text-muted-foreground` | 8 | `IMText variant="label" tone="muted"` | weight 600 → 700 |
| 27 | `text-xs font-bold` | 8 | `IMText variant="label" tone="inherit"` | 12.5 → 13.5px |
| 28 | `text-xs text-destructive` | 7 | `IMCaption tone="destructive"` | weight 400 → 500 |
| 29 | `text-lg font-extrabold text-foreground` | 7 | `IMTitle` (`as` = the original element) | weight 800 → 700 |
| 30 | `text-xs font-semibold` | 6 | `IMText variant="label" tone="inherit"` | 12.5/600 → 13.5/700 |

### Named legacy cases

| Today | Becomes | Visual change |
|---|---|---|
| `font-assistant` (90 call sites outside `ui/`, mostly on page wrappers) | delete the class | none |
| `.auth-title` (`<h1>`) | `<IMHeadline className="text-center">` | 25 → 23px, Open Sans → Assistant, no tracking |
| `.auth-sub` | `<IMText tone="muted" className="text-center">` | none |
| `.step-question` (`<h1>`, often with `text-3xl`) | `<IMDisplay>` | 29 → 28px, Open Sans → Assistant, no tracking |
| `.step-hint` | `<IMText tone="muted">` | line 1.625 → 1.5 |
| `.page-head h1` | `<IMHeadline>` | Open Sans → Assistant, no tracking |
| `.page-head p` | `<IMText variant="body-sm" tone="muted">` | none |
| `.form-label` on `<label>` / `FormLabel` / `Label` | `IMLabel` (drop the class) | none |
| `text-xl font-extrabold` page / sheet titles (`ConversationList`, `MemberDetail`, `ProjectPanelHeader`) | `IMHeadline` (`as="h1"`/`"h2"`) | 20 → 23px, Assistant |
| Big figures: `text-3xl font-extrabold` times (`HoursStep`, `Step3WorkHours`), `StatStrip` values `text-2xl … sm:text-3xl` | `<IMDisplay as="span"><IMNum>10:00</IMNum></IMDisplay>`; stat values `<IMHeadline as="p"><IMNum>…</IMNum></IMHeadline>` | Assistant; the stats lose the `sm:` jump to 28px |
| `text-mini` (7) | `IMCaption` | already 12.5px via the alias |
| `text-micro` (31) | `IMText variant="micro"` | already 11/12px via the alias |
| `<span className="tabular-nums">{n}</span>`, `<span dir="ltr">{phone}</span>` | `<IMNum>` | none |

## Lint (`eslint/design-system/typography.js`)

Every message starts with `[ds:typography]`; `pnpm ds:audit` counts them. "Outside `ui/`" rules
skip `src/components/ui/`, where the primitives are built. Class rules match string literals and
template-literal chunks anywhere (`className`, `cn()`, lookup maps), except the values of
name-like attributes (`data-*`, `aria-*`, `id`, `htmlFor`, `name`, `role`, `type`).

| Rule | Where | Why |
|---|---|---|
| `font-assistant` class | outside `ui/` | Legacy alias (plan 3.2). Can be widened to `ui/` once `ui/` has dropped its own uses |
| `font-display`, `font-body` class | outside `ui/` | Faces are chosen by role, in `typography.tsx` only |
| Raw `<h1>`–`<h6>` | outside `ui/` | Headings are `IMHeading` / shortcuts, so the look and the outline level are decided separately |
| `text-{size}` or `font-{weight}` on `<p>` / `<span>` | outside `ui/` | See below |
| `text-micro`, `text-mini` | everywhere | Interim aliases; the count must reach 0 before Phase 3 can delete them |
| `.auth-title`, `.auth-sub`, `.step-question`, `.step-hint`, `.form-label` | everywhere | Legacy text classes; Phase 3 deletes them from `styles.css` once this is 0 |
| `uppercase`, `lowercase`, `capitalize` | everywhere | Hebrew rule 1 |
| `tracking-*` | everywhere | Hebrew rule 2 |
| `text-left`, `text-right` | everywhere | Hebrew rule 4 |

**Bare sizes on `<p>` / `<span>` are an error, not an audit-only count.**
- The spec rule ("don't size text with Tailwind classes in features") is only real if something
  enforces it after Phase 2.
- Phase 2's definition of done is `ds:audit` = 0. An audit-only number would never be required
  to reach 0, and the drift that produced 151 distinct size/weight combinations would come back.
- `ds:audit` only counts lint messages, so a count outside lint would need a second tool.

The rule is scoped to `<p>` and `<span>`, the elements that exist only to hold text. A `<div>`,
`<li>` or `<td>` that sets a size usually sizes a group of children. Phase 2 converts those by
step 0 of the table, but lint doesn't flag them. Arbitrary `text-[13px]` sizes are already
flagged by `[ds:colors]`, on any element.
