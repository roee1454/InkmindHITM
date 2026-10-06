# IMIcon

A filled icon from the closed Inkmind registry: `<IMIcon name="calendar" size="sm" tone="muted" />`.

## Props
- `name` — an `IMIconName` (typed union). The registry decides glyph, weight and RTL mirroring; a call site can't override any of them.
- `size` — `xs 12 · sm 16 · md 20 (default) · lg 24 · xl 32`. Tokens only, no numbers.
- `tone` — `inherit` (default) · `default · muted · accent · success · warning · destructive · artist-1…8`.
- `label` — makes the icon meaningful: `role="img"` + `aria-label`. Without it the icon is `aria-hidden`.
- `spin` — for `spinner` only.

## The look
- **Filled, always.** Every glyph with an inside (calendar, user, trash, bell, lens of the search glass, chat bubble) uses Phosphor's `fill` weight.
- **Pure strokes are bold.** `check`, `close`, `plus`, arrows, `link`, `attach`, `more`, `menu`, `spinner`. Their `fill` weight boxes them into a solid square — that's a different icon, not a filled one.
- Carets (`chevron-*`) are solid triangles.

## Colour
- Default is `inherit`: inside a button, badge or menu item the icon takes that element's colour. Don't set a tone there.
- Beside text, decoration is `muted`; an icon that *is* the content (empty state, row lead) is `default`.
- `success` / `warning` / `destructive` only when the icon reports a system outcome. `artist-N` only to name an artist.

## Sizes by context
`xs` in badges · `sm` with body-sm text, inputs, menu items, sm buttons · `md` in buttons, nav, card headers · `lg` icon-only toolbar buttons · `xl` empty states only.

## Adding an icon
Add one entry to `icon-registry.ts`: a semantic kebab-case name (what it means, not what it draws), the Phosphor glyph, the weight by the rule above, and `mirrorInRtl` if it points somewhere. Nothing else in the app imports `@phosphor-icons/react`.

## Replaces
The 106 lucide-named glyph exports (`Trash2`, `CheckCircle2`, `Loader2`, `Edit3`, `XIcon`, `ChevronDownIcon`…), `IMIcon icon={Glyph}`, `className="h-4 w-4 text-…"` sizing, and the raw emerald/amber/rose tone map.
