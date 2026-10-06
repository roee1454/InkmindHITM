# Icons

Every icon in the app is `<IMIcon name="…" />` from `@/components/ui/icon`: a filled glyph from a closed registry of 94 names.

```tsx
<IMIcon name="calendar" size="sm" tone="muted" />
<IMButton><IMIcon name="plus" /> לקוח חדש</IMButton>
<IMIcon name="spinner" size="sm" spin />
<IMIcon name="warning" tone="warning" label="התשלום נכשל" />
```

Source: `src/components/ui/icon-registry.ts` (the registry), `src/components/ui/icon.tsx` (`IMIcon`). Lint: `eslint/design-system/icons.js`. Approved spec: [`im-design-system/spec/components/IMIcon.md`](../im-design-system/spec/components/IMIcon.md).

## The look: always filled

- **A glyph with an inside is `fill`.** Calendar, user, trash, bell, the chat bubble, the lens of the search glass. A filled shape reads at 12–16px, where Phosphor's 1.5px regular outline turns to noise, and it matches the solid black-and-white controls.
- **A pure stroke is `bold`.** `check`, `close`, `plus`, the arrows, `link`, `attach`, `more`, `menu`, `spinner`, `refresh`, `undo`/`redo`, `repeat`, `reply`, `download`/`upload`, `activity`, `trend-up`. These glyphs have no inside, so Phosphor's `fill` weight boxes them into a solid square. That draws a different icon, not a filled version of this one.
- **Carets are solid triangles** (`chevron-*`, `fill`).

The registry decides the weight. A call site can't change it: `IMIcon` has no `weight` prop.

## Props

| prop | values | default | notes |
|---|---|---|---|
| `name` | `IMIconName`, a typed union of the 94 names below | — | What the icon *means*. The registry decides glyph, weight and RTL mirroring |
| `size` | `xs` 12 · `sm` 16 · `md` 20 · `lg` 24 · `xl` 32 | `md` | Tokens only. No pixel numbers, no `size-*` / `h-* w-*` classes |
| `tone` | `inherit` · `default` · `muted` · `accent` · `success` · `warning` · `destructive` · `artist-1…8` | `inherit` | From `src/components/ui/tones.ts`, the same vocabulary as text and badges |
| `label` | string | — | Gives `role="img"` + `aria-label`. Without it the icon is `aria-hidden` |
| `spin` | boolean | — | Only on `spinner`, and the compiler enforces it. Uses `motion-safe:animate-spin`, so it pauses under reduced motion |
| `className` | string | — | **Layout only**: margins, position, visibility, a hover opacity. Size and colour go through `size` and `tone` |

Types: `IMIconProps`, `IMIconName`, `IMIconSize`, `IMIconTone`.

## Sizes by context

| size | px | where |
|---|---|---|
| `xs` | 12 | Inside badges and status labels, beside `micro`/`caption` text |
| `sm` | 16 | Beside `body-sm` text, inside inputs, menu items, `sm` buttons, list-row chevrons |
| `md` | 20 | Default. Buttons, nav items, card headers |
| `lg` | 24 | Icon-only toolbar buttons |
| `xl` | 32 | Empty states only |

## Colour

- **`inherit` is the default, and inside a holder it's the right choice.** In a button, badge, menu item or link, the icon takes that element's colour. Don't set a tone there. `inherit` adds no colour class, so a holder that colours its icons (a menu item's muted glyph) keeps doing so.
- **Beside text, decoration is `muted`.** An icon that labels a row, a field or a meta line (`clock` next to a time, `phone` next to a number) is muted.
- **An icon that *is* the content is `default`**: the lead of a list row. The exception is empty states: `IMEmptyState` renders its icon `xl` and `muted` inside a `surface-2` disc.
- **`success` / `warning` / `destructive` only report a system outcome**: a payment failed, a sync succeeded, a delete is about to happen. Never as decoration. This is the monochrome doctrine in [design-system.md](../design-system.md).
- **`artist-1…8` only name an artist**, such as the needle on an appointment of artist 3.
- `accent` is monochrome emphasis (the accent ink), not a brand hue.

## Accessibility

- Most icons sit next to text that already says what they mean. Those are decorative: leave `label` off and the icon is `aria-hidden`.
- An icon that carries meaning on its own (an icon-only status, a lone warning glyph) takes `label` in Hebrew: `<IMIcon name="check-double" label="נקרא" />`.
- An icon-only *button* puts its `aria-label` on the button, not on the icon.

## RTL

The app root is `dir="rtl"`. Glyphs that point somewhere carry `mirrorInRtl` in the registry and render with `rtl:-scale-x-100`. A call site never flips an icon: no `rotate-180` or `scale-x` on a directional glyph.

Directions are logical: `chevron-start` points to the inline start (right, in Hebrew), `chevron-end` to the inline end (left). "Next", "continue", "open this row" use `chevron-end`. "Previous" and "back" use `chevron-start` / `arrow-back`.

## The registry

Grouped as in the approved spec. Weight follows the fill rule above.

### Status · 15

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `check` | Check | bold |  |
| `check-double` | Checks | bold |  |
| `check-circle` | CheckCircle | fill |  |
| `verified` | SealCheck | fill |  |
| `close` | X | bold |  |
| `info` | Info | fill |  |
| `help` | Question | fill |  |
| `warning` | Warning | fill |  |
| `warning-circle` | WarningCircle | fill |  |
| `shield-check` | ShieldCheck | fill |  |
| `shield-warning` | ShieldWarning | fill |  |
| `prohibited` | Prohibit | fill |  |
| `spinner` | CircleNotch | bold |  |
| `dot` | Circle | fill |  |
| `star` | Star | fill |  |

### Actions · 28

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `plus` | Plus | bold |  |
| `edit` | PencilSimple | fill |  |
| `trash` | Trash | fill |  |
| `copy` | Copy | fill |  |
| `save` | FloppyDisk | fill |  |
| `search` | MagnifyingGlass | fill |  |
| `zoom-in` | MagnifyingGlassPlus | fill |  |
| `filter` | SlidersHorizontal | fill |  |
| `refresh` | ArrowsClockwise | bold |  |
| `undo` | ArrowCounterClockwise | bold | yes |
| `redo` | ArrowClockwise | bold | yes |
| `repeat` | Repeat | bold |  |
| `reply` | ArrowBendUpLeft | bold | yes |
| `send` | PaperPlaneRight | fill | yes |
| `download` | DownloadSimple | bold |  |
| `upload` | UploadSimple | bold |  |
| `external-link` | ArrowSquareOut | fill | yes |
| `link` | Link | bold |  |
| `attach` | Paperclip | bold |  |
| `more` | DotsThreeVertical | bold |  |
| `menu` | List | bold |  |
| `sidebar` | SidebarSimple | fill | yes |
| `logout` | SignOut | fill | yes |
| `eye` | Eye | fill |  |
| `eye-off` | EyeSlash | fill |  |
| `lock` | Lock | fill |  |
| `key` | Key | fill |  |
| `keyboard` | Keyboard | fill |  |

### Direction · 7

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `chevron-down` | CaretDown | fill |  |
| `chevron-up` | CaretUp | fill |  |
| `chevron-start` | CaretLeft | fill | yes |
| `chevron-end` | CaretRight | fill | yes |
| `arrow-back` | ArrowLeft | bold | yes |
| `arrow-up` | ArrowUp | bold |  |
| `trend-up` | TrendUp | bold | yes |

### Studio · 23

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `calendar` | CalendarDots | fill |  |
| `calendar-blank` | CalendarBlank | fill |  |
| `calendar-check` | CalendarCheck | fill |  |
| `calendar-plus` | CalendarPlus | fill |  |
| `calendar-x` | CalendarX | fill |  |
| `calendar-off` | CalendarSlash | fill |  |
| `calendar-heart` | CalendarHeart | fill |  |
| `clock` | Clock | fill |  |
| `needle` | Needle | fill |  |
| `pen-nib` | PenNib | fill |  |
| `image` | Image | fill |  |
| `kanban` | Kanban | fill |  |
| `first-aid` | FirstAid | fill |  |
| `heartbeat` | Heartbeat | fill |  |
| `activity` | Pulse | bold |  |
| `map-pin` | MapPin | fill |  |
| `home` | House | fill |  |
| `settings` | Gear | fill |  |
| `chart-bar` | ChartBar | fill |  |
| `database` | Database | fill |  |
| `monitor` | Monitor | fill |  |
| `moon` | Moon | fill |  |
| `sun` | Sun | fill |  |

### People & messages · 11

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `user` | User | fill |  |
| `user-check` | UserCheck | fill |  |
| `user-gear` | UserGear | fill |  |
| `users` | Users | fill |  |
| `chat` | ChatCircleDots | fill |  |
| `mail` | Envelope | fill |  |
| `phone` | Phone | fill |  |
| `bell` | Bell | fill |  |
| `bell-ringing` | BellRinging | fill |  |
| `bot` | Robot | fill |  |
| `sparkle` | Sparkle | fill |  |

### Money & documents · 10

| name | Phosphor glyph | weight | mirrors in RTL |
|---|---|---|:---:|
| `coins` | Coins | fill |  |
| `hand-coins` | HandCoins | fill |  |
| `credit-card` | CreditCard | fill |  |
| `wallet` | Wallet | fill |  |
| `bank` | Bank | fill |  |
| `receipt` | Receipt | fill |  |
| `file-text` | FileText | fill |  |
| `file-download` | FileArrowDown | fill |  |
| `clipboard` | ClipboardText | fill |  |
| `certificate` | Certificate | fill |  |

## Adding an icon

1. Check the table first: names say what an icon means, so `trash` covers every delete and `edit` every pencil.
2. Add one entry to `IM_ICONS` in `src/components/ui/icon-registry.ts`, in its group:
   - a semantic kebab-case name: what it means (`archive`), not what it draws (`box-arrow-down`);
   - the Phosphor glyph, imported by its `…Icon` name;
   - the weight, by the fill rule: `fill` if the glyph has an inside, `bold` if it is a pure stroke;
   - `mirrorInRtl: true` if it points somewhere.
3. Add its row to the table above. While the spec mirror exists (until plan Phase 3, item 3.3), add it to `docs/im-design-system/spec/icon-registry.json` too. `tests/components/icon-registry.test.tsx` checks the name, the glyph and the weight against both.

Nothing outside `icon-registry.ts` imports `@phosphor-icons/react`. The lint rule enforces this.

## Legacy names → registry names (interim)

Before the registry, `icon.tsx` exported 118 lucide-named wrappers (`Trash2`, `Loader2`, `XIcon`…). The 105 that still have callers live in `src/components/ui/icon-legacy.ts` until Phase 2 migrates them. The 13 without callers were deleted. Each one draws exactly what its registry name draws. The map is `LEGACY_TO_IM` in that file, and the codemod reads it. The file, its re-export from `icon.tsx` and this section go in plan Phase 3, item 3.1, once `grep -rw` finds no caller for any of them.

Physical directions map by what they show under `dir="rtl"`: `ChevronLeft` points to the inline end, so it becomes `chevron-end`. `ArrowLeft` has one caller, a "continue" button (`המשך לבחירת תבנית`). The registry has no forward arrow, so it maps to `chevron-end` too.

| legacy export(s) | name |
|---|---|
| `Activity` | `activity` |
| `ArrowUp` | `arrow-up` |
| `Paperclip` | `attach` |
| `Bank` | `bank` |
| `Bell` | `bell` |
| `BellRing` | `bell-ringing` |
| `Bot` | `bot` |
| `Calendar`, `CalendarClock`, `CalendarDays` | `calendar` |
| `CalendarCheck` | `calendar-check` |
| `CalendarOff` | `calendar-off` |
| `CalendarPlus` | `calendar-plus` |
| `CalendarX` | `calendar-x` |
| `ChartBar` | `chart-bar` |
| `MessageCircle`, `MessageSquare`, `MessageSquarePlus` | `chat` |
| `Check`, `CheckIcon` | `check` |
| `CheckCircle`, `CheckCircle2` | `check-circle` |
| `CheckCheck` | `check-double` |
| `ChevronDown`, `ChevronDownIcon` | `chevron-down` |
| `ArrowLeft`, `ChevronLeft` | `chevron-end` |
| `ChevronRight`, `ChevronRightIcon` | `chevron-start` |
| `ChevronUp`, `ChevronUpIcon` | `chevron-up` |
| `ClipboardList` | `clipboard` |
| `Clock` | `clock` |
| `X`, `XIcon` | `close` |
| `Coins` | `coins` |
| `Copy` | `copy` |
| `CreditCard` | `credit-card` |
| `Database` | `database` |
| `CircleIcon` | `dot` |
| `Download` | `download` |
| `Edit3`, `Pencil`, `PencilLine`, `PencilSimple` | `edit` |
| `ExternalLink` | `external-link` |
| `Eye` | `eye` |
| `EyeOff` | `eye-off` |
| `FileCheck` | `file-download` |
| `FileText` | `file-text` |
| `SlidersHorizontal` | `filter` |
| `HelpCircle` | `help` |
| `Home` | `home` |
| `Image` | `image` |
| `Info` | `info` |
| `SquareKanban` | `kanban` |
| `KeyRound` | `key` |
| `Link`, `Link2` | `link` |
| `Lock` | `lock` |
| `LogOut` | `logout` |
| `Mail` | `mail` |
| `MapPin` | `map-pin` |
| `Menu` | `menu` |
| `Monitor` | `monitor` |
| `Moon` | `moon` |
| `EllipsisVertical` | `more` |
| `Needle`, `Tattoo` | `needle` |
| `PenTool` | `pen-nib` |
| `Phone` | `phone` |
| `Plus` | `plus` |
| `BotOff` | `prohibited` |
| `Receipt`, `ReceiptText` | `receipt` |
| `ArrowsClockwise`, `RefreshCw` | `refresh` |
| `Repeat` | `repeat` |
| `Reply` | `reply` |
| `Search` | `search` |
| `PaperPlaneTilt`, `Send`, `SendHorizontal` | `send` |
| `Settings` | `settings` |
| `ShieldCheck` | `shield-check` |
| `ShieldAlert` | `shield-warning` |
| `SidebarToggle` | `sidebar` |
| `Sparkle`, `Sparkles` | `sparkle` |
| `Loader2` | `spinner` |
| `Star` | `star` |
| `Sun` | `sun` |
| `Trash`, `Trash2` | `trash` |
| `RotateCcw` | `undo` |
| `Upload` | `upload` |
| `User` | `user` |
| `Users` | `users` |
| `BadgeCheck` | `verified` |
| `Wallet` | `wallet` |
| `AlertTriangle`, `TriangleAlert`, `Warning` | `warning` |
| `AlertCircle` | `warning-circle` |
| `ZoomIn` | `zoom-in` |

Looks that changed when the legacy exports moved onto the registry:

| legacy | change |
|---|---|
| `Search`, `SlidersHorizontal`, `ZoomIn`, `ExternalLink`, `SidebarToggle` | `bold` → `fill`: they have an inside |
| `Activity`, `Paperclip` | `fill` → `bold`: they are pure strokes |
| `CalendarDays` | Calendar → CalendarDots, folded into `calendar` |
| `MessageSquare` | ChatTeardropDots → ChatCircleDots, folded into `chat` |
| `Link2` | LinkSimple → Link, folded into `link` |
| `Pencil`, `PencilLine` | → PencilSimple, folded into `edit` |
| `Send`, `PaperPlaneTilt`, `SendHorizontal` | → PaperPlaneRight, mirrored: points to the inline end (left) |
| `Reply`, `RotateCcw`, `LogOut`, `ExternalLink`, `SidebarToggle` | now mirrored in RTL |
| `ArrowLeft` | → a solid caret pointing to the inline end (`chevron-end`) |
| `ChevronLeft`, `ChevronRight`, `ChevronRightIcon` | same pixels in RTL, now through logical `chevron-end` / `chevron-start` |

## Migrating a folder: the codemod

```sh
pnpm ds:codemod icons src/features/<x>            # dry run: a per-area table and every site it can't do
pnpm ds:codemod icons src/features/<x> --write    # apply
pnpm tsc --noEmit                                 # then prettier on the touched files
```

`<Trash2 className="h-4 w-4 text-muted-foreground" />` becomes `<IMIcon name="trash" size="sm" tone="muted" />`. The import drops the legacy names that have no use left and adds `IMIcon`.

- **Size.** `size-N`, `h-N w-N`, `size-[Npx]` and `size={N}` snap to the nearest token, ties going up:

  | px | ≤13 | 14–17 | 18–21 | 22–27 | ≥28 |
  |---|---|---|---|---|---|
  | token | `xs` | `sm` | `md` (not written: the default) | `lg` | `xl` |

  So 13 → `xs` (one off 12), 14 → `sm` (a tie), 18 → `md` (a tie), 22 → `lg` (a tie), 28 → `xl` (a tie). An icon with no size at the source (1em, or sized by its holder's `[&_svg]` rule) becomes `md` and is listed under "check". Inside a menu item or an input, make it `sm`.
- **Tone.** `text-muted-foreground` → `muted` · `text-foreground` → `default` · `text-destructive` → `destructive` · `text-success` → `success` · `text-warning` → `warning` · `text-accent-ink` and `text-primary` → `accent` · `text-artist-N` → `artist-N`. Opacity variants (`text-muted-foreground/60`) and state variants (`group-hover:text-foreground`) stay in `className`. Any other colour class stays too, and is listed under "check".
- **Dropped:** `shrink-0` (IMIcon never shrinks), `text-inherit` / `text-current`, `aria-hidden` (the default). A `weight` equal to the registry's is dropped too.
- **Converted:** `animate-spin` on `Loader2` → `spin`. `aria-label` → `label`.

**Left untouched and reported** (`file:line reason`). Fix these by hand:

| pattern | fix |
|---|---|
| Component reference: `icon: Calendar` in a config, `typeof Home`, `const Icon = cond ? A : B`, `STATUS_ICON[status]` | Store the `IMIconName` string (`icon: 'calendar'`, type `IMIconName`) and render `<IMIcon name={item.icon} />` |
| Dynamic renderer: `<item.icon />`, `<Icon />`, `<KindIcon />` (listed separately) | Becomes `<IMIcon name={…} />` once its source holds names |
| Dynamic `className` (`cn(…)`, a template) | Split it: size and tone into props (a conditional tone becomes `tone={read ? 'muted' : 'default'}`), layout stays in `className` |
| Dynamic `size={…}` | Pick a token, or a conditional token (`size={compact ? 'xs' : 'sm'}`) |
| `animate-spin` on anything but `Loader2` (a spinning `RefreshCw`) | Show `spinner` with `spin` while busy, or drop the spin |
| `rotate-180` / `scale-x` on a mirrored glyph (`<SendHorizontal className="rotate-180" />`) | Delete the flip: the registry mirrors it. Check the direction in RTL |
| A `weight` different from the registry's | Delete it. If the other weight is really needed, it's a different icon: raise it as a gap |
| `{...props}`, `style`, `onClick`, `data-*`, `title`, children | Move the behaviour to a wrapping element. The icon only takes `name`, `size`, `tone`, `label`, `spin`, `className` |
| A variant size class (`md:size-5`), `h-*` ≠ `w-*` | Pick one token |

## Lint (`eslint/design-system/icons.js`)

- Importing `@phosphor-icons/react` anywhere but `icon-registry.ts`.
- Importing a legacy name from `@/components/ui/icon` (or `#/components/ui/icon`): `[ds:icons] Legacy icon — use <IMIcon name="…" />`. `pnpm ds:audit` counts these as the Phase 2 icon work. After Phase 3 the names no longer exist, so `tsc` takes over.
- A `size-*`/`h-*`/`w-*` class or a token colour class on `IMIcon`: use `size` and `tone`.
