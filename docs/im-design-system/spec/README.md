# IM design system — approved target spec

Approved 2026-10-06. Mirrored from the design-system artifact (https://claude.ai/artifact/1mRq6AGcJWpikQ4qcMBP6Q), which shows every component live in both themes. This folder is the contract Phase 1 implements; once the pillar pages under `docs/design-system/` exist, they become canonical and this folder is deleted (plan Phase 3).

| File | What |
|---|---|
| `brand-book.md` | The rules: content, colour, type, spacing, shape, motion, iconography, components |
| `tokens.json` | Every token with its value per theme and a usage note |
| `components/<IMName>.md` | Per component: purpose, props, rules, what it replaces |
| `api.md` | Indicative prop vocabulary (compound parts stay) |
| `icon-registry.json` | The 94 icon names → Phosphor glyph, weight, RTL mirroring |
| `reference.css` | Exact visual values of every component rendition (heights, paddings, radii, weights) — translate to Tailwind, don't copy |
| `screen-customers.html` | A full screen built only from IM parts |

## Changes from today that the spec approves

1. Headings `display` and `headline` render **Assistant 800**; everything else Open Sans.
2. Controls (buttons, inputs, selects, tab rail, pagination buttons) use `radius-control` **10px** (today 12).
3. Dark-theme destructive buttons take **ink text** (`--brand-on-destructive`, done in Phase 0).
4. Stroke-only icons (`check`, `close`, `plus`, arrows, `link`, `attach`, `more`, `menu`, `spinner`) stay `bold`; every glyph with an inside is `fill`, including the search lens.
5. One small-text ladder: `micro` = 11px desktop / 12px touch (today `text-micro` is 10px on desktop).
6. Two additions: `IMEmptyState` and `IMListRow` (from `.row-native`).
7. Phone/email/URL/money inputs are LTR with a bare example placeholder (Hebrew in an LTR field renders scrambled).
