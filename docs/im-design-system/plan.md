# IM Design System — Plan

Branch: `feat/im-design-system` (from `19b6936`). Baseline: `tsc` clean, 121 test files / 974 tests pass, 49 design-system lint errors (44 in `features/calendar`).

**Target spec (approved 2026-10-06):** [`spec/`](spec/README.md), mirrored from the live design-system artifact. Phase 1 implements it; where this plan and the spec disagree, the spec wins.

**Status:** Phase 0 done · Phase 1 done (A 876ec89, B f045451, C e6a2472) · Phase 1b running · audit baseline for Phase 2: 1,428.

Goal: one fixed design system for every shared component (`IM*` prefix), for text (sizes, fonts, when to use which) and for icons (palette, always-filled look) — then bring every feature onto it, in parallel, with a repeatable audit that proves it.

---

## 1. Where we start (audit of the half-built layer, 2026-10-06)

| Area | State | Problem |
|---|---|---|
| `src/components/ui/*` | Every file exports the old name **and** an `IM*` alias (`export { Button, Button as IMButton }`) | Compatibility aliases are banned (CLAUDE.md, Superseded Logic Rule). Features use the old names: `IM*` adoption outside `ui/` is ~0. |
| `typography.tsx` | `IMHeading` / `IMText` / `IMTitle` / `IMCaption` exist | Not used by any feature. Headings use `font-assistant`, which `styles.css` aliases to the **body** font — Assistant never renders. Arbitrary `md:text-[29px]` overrides. Tones use raw `emerald/amber/rose` although `text-success/warning/destructive` tokens exist. |
| `icon.tsx` | 106 lucide-named Phosphor wrappers + `IMIcon icon={}` | Duplicates (`Trash`/`Trash2`, `Check`/`CheckIcon`, `X`/`XIcon`, `Sparkle`/`Sparkles`, `Menu`/`List`, `Calendar`/`CalendarClock`). Sizes set ad hoc in 327 places. `IMIcon` default tone `text-foreground` overrides the colour of a button it sits in. |
| `docs/design-system.md` | Documents an "Export Aliases" column and an Assistant/Open Sans split | Contradicts the code. |
| `eslint.config.js` | Guards raw palette, arbitrary radius/shadow/px size, `lucide-react` | Ignores `src/components/ui/**` entirely — that is how `ui/` drifted. |
| `package.json` | `lucide-react` | 0 imports left. |

Baseline debt per area (`.tsx` outside `ui/`):

| Area | files | LOC | raw palette | `font-*` | raw `<h1-6>` | `<p/span>` with text classes | icon sized by class | raw `<button>` | raw form control | LTR props |
|---|---|---|---|---|---|---|---|---|---|---|
| calendar | 30 | 4233 | 131 | 19 | 3 | 87 | 65 | 41 | 0 | 20 |
| settings | 31 | 3334 | 0 | 5 | 3 | 63 | 42 | 11 | 2 | 0 |
| conversations | 25 | 2957 | 0 | 16 | 5 | 62 | 52 | 18 | 1 | 8 |
| projects | 16 | 1401 | 0 | 7 | 5 | 32 | 17 | 7 | 0 | 1 |
| onboarding | 9 | 1388 | 2 | 0 | 11 | 32 | 18 | 21 | 6 | 0 |
| components (shell) | 13 | 1265 | 0 | 20 | 2 | 17 | 17 | 8 | 0 | 1 |
| mcp-assistant | 9 | 910 | 0 | 7 | 0 | 27 | 22 | 15 | 4 | 5 |
| routes | 32 | 756 | 0 | 2 | 3 | 2 | 1 | 1 | 0 | 0 |
| customers | 9 | 728 | 0 | 1 | 2 | 22 | 12 | 3 | 0 | 0 |
| auth | 4 | 640 | 0 | 4 | 3 | 5 | 13 | 10 | 0 | 4 |
| payments | 6 | 572 | 0 | 0 | 0 | 20 | 10 | 0 | 0 | 0 |
| invite | 6 | 510 | 0 | 1 | 6 | 13 | 10 | 12 | 1 | 0 |
| analytics | 4 | 475 | 0 | 9 | 4 | 43 | 3 | 1 | 0 | 0 |
| health-declaration | 3 | 345 | 0 | 2 | 1 | 9 | 12 | 1 | 0 | 5 |
| dashboard | 5 | 344 | 0 | 1 | 3 | 11 | 7 | 2 | 0 | 0 |
| notifications | 5 | 344 | 0 | 1 | 2 | 11 | 8 | 4 | 0 | 0 |
| database | 3 | 204 | 0 | 1 | 1 | 5 | 13 | 0 | 0 | 0 |
| leads | 3 | 138 | 0 | 3 | 1 | 0 | 5 | 1 | 0 | 0 |
| **Total** | 213 | 20544 | 133 | 99 | 55 | 461 | 327 | 156 | 14 | 44 |

These are rough regex counts. Phase 0 replaces them with `pnpm ds:audit`, the real measuring tool.

---

## 2. Decisions (2026-10-06)

1. **Fonts**: Assistant (800) for Display and Headline only. Open Sans for everything else.
2. **Icons**: a closed registry. `<IMIcon name="calendar" size="sm" tone="muted" />`. `name` is a typed union. Glyph and weight are decided once, in the registry. Nothing outside the registry imports `@phosphor-icons/react`.
3. **Naming**: every component, hook and type exported from `src/components/ui` is `IM*`-prefixed (`IMButton`, `IMCardHeader`, `useIMToast`, `IMButtonProps`). No unprefixed alias survives. The rename is done by a codemod in one pass, not by hand.
4. **Fill rule**: a glyph that has an interior renders `fill`. A glyph with no interior (check, x, plus, arrows, chevrons, spinner) renders `bold` so it doesn't collapse into a blob. The registry encodes this; call sites can't override it.
5. **`ui/` is linted** like the rest of `src/` (the blanket ignore goes). Narrow, commented per-file exceptions only.
6. **One tone vocabulary** across text, icons and badges: `default · muted · accent · success · warning · destructive · inherit`. Icons add `artist-1..8`. Every tone maps to a theme token. None maps to a raw palette class.

---

## 3. How the work runs

```
Phase 0  lead         audit tooling, shared tone map, rule-file split, baseline report
Phase 1  3 agents     A components · B typography · C icons          (parallel, disjoint files)
Phase 1b agent A      ui/ internals adopt IMIcon + IMText once B and C land
         lead         review, visual check of ui/ primitives, commit per pillar
Phase 2  10 agents    one per feature (tiny ones grouped), 2 waves    (parallel, disjoint folders)
         lead         between waves: fold gap requests into ui/, visual check, commit per feature
Phase 3  lead         delete interim legacy exports, final audit = 0, docs, walkthrough
```

### Ground rules for every subagent

- **File ownership is strict.** An agent edits only the paths it owns (tables below). It needs something elsewhere — a missing primitive, icon, token or rule? Then it reports it as a **gap** and works around it locally. It never edits another owner's file.
- **No git**: no commit, stash, checkout or reset. The lead commits each agent's work after review.
- **No dev server, no PocketBase, no browser.** The lead does visual verification centrally, once per wave, on one dev server, and kills it afterwards (CLAUDE.md).
- **No server or business logic**: never edit `*.server.ts`, `server/`, `hooks/` data logic, `pocketbase/`, `integrations/`.
- **Verification before reporting**: `pnpm tsc --noEmit`, filtered to the agent's own paths (other agents are mid-edit in the same tree). Then the agent's own tests: `pnpm test tests/<own path>`. Then `pnpm ds:audit --area <own area>` must be 0.
- **Report format**: files changed · **Removes** (what was deleted, with the grep that proved no caller is left) · gaps · anything that changed visually and should be screenshotted.

---

## 4. Phase 0 — Audit tooling (lead) · done

| Item | What | Removes |
|---|---|---|
| 0.1 Rule-file split | `eslint/design-system/{colors,components,typography,icons}.js`, each exporting `{ syntax: [], imports: [] }`. `eslint.config.js` concatenates them into one `no-restricted-syntax` and one `no-restricted-imports` (ESLint keeps only the last config of a rule, so they must be merged, not layered). Move today's colour/radius/shadow/px-size rules into `colors.js`. | The inline rule block in `eslint.config.js`. The `lucide-react` import rule (dependency removed in 0.4). |
| 0.2 `pnpm ds:audit` | `scripts/ds-audit.ts` runs ESLint's Node API over `src/` with only the design-system rules. It groups violations by area (`features/<x>`, `components`, `components/ui`, `routes`) and prints a table. `--area <x>` filters; `--write` regenerates `docs/im-design-system/audit.md`. | Nothing (new). |
| 0.3 Shared tones | `src/components/ui/tones.ts`: the tone → token class map from decision 6. B and C import it, so text and icons can't diverge. | Nothing yet. B and C remove their inline tone maps. |
| 0.4 Dead dependency | Drop `lucide-react` from `package.json` and the lockfile. | `lucide-react`: 0 imports (`grep -r "lucide-react" src tests` was empty on 2026-10-06). |
| 0.6 Spec + dark destructive ink | `docs/im-design-system/spec/` mirrors the approved artifact. `--brand-on-destructive` gives the dark destructive fill ink text (white was 2.6:1). | `--destructive-foreground: #ffffff` in both themes. |
| 0.5 Doc layout | `docs/design-system.md` stays the index (principles: RTL, palette, states) and links to `docs/design-system/{components,typography,icons}.md`, one page per Phase 1 owner. | The "Export Aliases" column and the typography/icon sections, which move to their pages. |

---

## 5. Phase 1 — The design system (3 parallel agents)

### A · Components (`IM*` primitives)

**Owns**: `src/components/ui/**` except `typography.tsx` and `icon*.ts(x)` · `tests/components/**` · `eslint/design-system/components.js` · `docs/design-system/components.md` · `scripts/ds/codemods/rename-ui-exports.ts`. It also owns the repo-wide **identifier-only** rename the codemod performs.

1. **API pass on all 29 primitives.** One prop vocabulary everywhere: `variant` (visual style), `size` (`sm · md · lg`), `tone` (from `tones.ts`). Plus loading, disabled and RTL behaviour. Every colour goes through tokens (lint now runs on `ui/`).
2. **Consolidate overlaps.** Look at `dialog` / `responsive-dialog` / `sheet` / `confirm-dialog` and at `select` / `select-input`. Merge them, or document which one is for what in one line each. Pick one import convention (per-file path vs the `index.ts` barrel) and enforce it with a lint rule.
3. **Missing primitives, driven by the audit.** Scan `src/features` for ad-hoc patterns that repeat **3+ times**. Candidates: icon-only buttons (much of the 156 raw `<button>`), empty states, section headers, info/key-value rows, chips/filter pills, stat tiles. Add an `IM*` primitive only where the repetition is real. List what you rejected and why.
4. **Rename codemod.** Use the TypeScript compiler API (already a dependency, no new tooling). Rename every import and JSX use of an old `ui/` export to its `IM*` name across `src/` and `tests/`. Then delete the old names. `tsc` must pass right after.
5. **Lint rules (`components.js`).** Ban raw `<button>`, `<input>`, `<select>`, `<textarea>` in `src/features` and `src/components`. Ban importing `radix-ui` outside `ui/`. Add the import-convention rule.
6. **Doc**: one row per primitive (purpose · when to use · when **not** to use · key props), plus a "pick the right overlay" decision table.

**Removes**: every unprefixed alias in `ui/*` (e.g. `Button`, `Card`, `useToast`, `SearchInput`) · the `src/components/ui/**` ignore in `eslint.config.js` · merged overlay/select primitives, if consolidated · the "shadcn-generated, not hand-edited" comment · tests that only covered removed exports.

**Phase 1b (after B and C report):** adopt `IMIcon name` and `IMText`/`IMHeading` inside `ui/*`. Example: the dialog close button, select chevrons, pagination arrows, toast icons, `confirm-dialog` copy.

### B · Typography

**Owns**: `src/components/ui/typography.tsx` · the font and type-scale sections of `src/styles.css` · `eslint/design-system/typography.js` · `docs/design-system/typography.md` · `tests/components/typography.test.tsx`.

1. **Fonts.** `--font-display` = Assistant and `--font-body` = Open Sans. Display/Headline use `font-display`, everything else inherits `font-body`. Trim the Google Fonts URLs to the weights actually used.
2. **Roles, not sizes.** Final role set: `display · headline · title · subtitle · body · body-sm · label · caption · micro`, plus a `numeric` modifier (`tabular-nums`, and bidi isolation for phone numbers and money inside RTL text). Each role is pinned to one step of the `@theme` scale. No `md:` overrides, no arbitrary px. Settle the overlap between `text-micro` (12), `text-mini` (13), `text-2xs` (11) and `text-xs` (12.5) — one ladder.
3. **Hebrew rules.** No `uppercase`, and no `tracking-wide` on Hebrew labels (a Latin habit; it breaks Hebrew letterforms). Line-heights tuned for Hebrew's taller ascenders. `text-start` only.
4. **Components.** `IMHeading` (semantic `as` decoupled from visual `variant`), `IMText`, and the role shortcuts. Tones come from `tones.ts`. Decide whether the typography label (`IMLabelText`) and the form `IMLabel` merge or get clearly distinct names.
5. **Migration table for Phase 2.** Take the ~30 most frequent text class combinations in `src/features`, e.g. `text-xs text-muted-foreground` and `text-sm font-semibold`. Map each one to its role. This is the lookup the feature agents follow, so their judgment calls agree.
6. **Lint rules (`typography.js`).** Ban `font-assistant`, `font-display` and `font-body` outside `ui/`. Ban raw `<h1>`–`<h6>` in features (use `IMHeading`). Ban `uppercase` and `tracking-*`. Whether bare `text-{size}`/`font-{weight}` on `<p>`/`<span>` becomes an error or an audit-only count is B's call, with the reason written down.

**Removes**: the `--font-assistant` alias and its "kept so the ~140 call sites keep resolving" comment (the call sites go in Phase 2, the alias in Phase 3) · whichever of `--text-micro`/`--text-mini` loses the ladder decision · raw-palette tones and `md:text-[..px]` in `typography.tsx` · unused font weights.

### C · Icons

**Owns**: `src/components/ui/icon.tsx`, `icon-registry.ts` and `icon-legacy.ts` · `eslint/design-system/icons.js` · `docs/design-system/icons.md` · `scripts/ds/codemods/icons.ts` with fixture tests under `tests/scripts/`.

1. **Registry.** `IM_ICONS: Record<IMIconName, { glyph, weight, mirrorInRtl? }>`. Use semantic kebab-case names (`calendar`, `trash`, `close`, `spinner`, `chevron-start`, `send`). Seed it from every glyph used today, after dedupe. It must cover 100% of current usage, so Phase 2 never needs a new icon.
2. **`IMIcon`.** Props: `name`, `size` (`xs 12 · sm 16 · md 20 · lg 24 · xl 32`, tokens only), `tone` (from `tones.ts`, plus `artist-1..8`; **default `inherit`**, so icons inside buttons take the button colour), `label` (gives `role="img"` and `aria-label`; without it the icon is `aria-hidden`), `spin`. Directional glyphs mirror in RTL via the registry flag, never at the call site.
3. **Palette rules.** When an icon is `muted` (decoration next to text) vs `default` vs a status tone. Status colour only for system outcomes, matching the monochrome doctrine in `docs/design-system.md`.
4. **Legacy bridge.** Move the 106 old glyph exports into `icon-legacy.ts`, re-exported from `icon.tsx`, with a header comment naming **Phase 3**. Phase 2 migrates callers, Phase 3 deletes the file.
5. **Codemod.** Rewrite `<Trash2 className="h-4 w-4 text-muted-foreground" />` to `<IMIcon name="trash" size="sm" tone="muted" />`. It maps `h-N w-N`, `size-N` and `size={N}` to size tokens, and token colour classes to tones. It keeps any other classes. It reports every site it can't rewrite, e.g. icons passed as component references (`icon: Calendar` in `navigation.ts`). Feature agents run it on their folder (`pnpm ds:codemod icons src/features/<x>`) and fix the leftovers.
6. **Lint rules (`icons.js`).** Ban `@phosphor-icons/react` everywhere except `icon-registry.ts`. Ban the `size` and `weight` props on raw glyphs. After Phase 3, `tsc` itself enforces "no legacy glyphs".

**Removes**: duplicate glyph aliases (folded into one registry name each) · `IMIcon icon={}` (replaced by `name`) · the raw-palette `ICON_TONES` map (moves to `tones.ts`) · the `styled()` wrapper. In Phase 3: `icon-legacy.ts` itself.

### Phase 1 exit (lead)

`tsc` clean, all tests pass, `ds:audit` for `components/ui` is 0. Visual check of the primitives on one dev server, with screenshots in `walkthrough.md`. One commit per pillar (A, B, C, 1b).

---

## 6. Phase 2 — Feature migration (10 agents, 2 waves)

Seventeen feature folders become 10 agents. Folders under ~900 LOC are grouped by coupling, so each agent has a meaningful amount of work.

| Wave | Agent | Owns (`src/features/…`, matching `src/routes/…` files, `tests/features/…`) | LOC |
|---|---|---|---|
| 1 | calendar | `calendar` | 4233 |
| 1 | settings | `settings` | 3334 |
| 1 | conversations | `conversations` | 2957 |
| 1 | projects | `projects`, `payments` | 1973 |
| 1 | entry flows | `onboarding`, `invite`, `auth` | 2538 |
| 1 | assistant | `mcp-assistant`, `analytics` | 1385 |
| 2 | customers | `customers`, `leads` | 866 |
| 2 | home | `dashboard`, `notifications` | 688 |
| 2 | records | `health-declaration`, `database` | 549 |
| 2 | shell | `src/components/*` (not `ui/`), all `src/routes/**` not owned above | 2021 |

Waves exist so that codemod bugs, missing primitives and missing icons found in wave 1 are fixed in `ui/` **before** wave 2 starts, by the lead or by re-engaging A, B or C.

**Per-feature checklist** (the agent's brief; done means `ds:audit --area <x>` = 0):

1. Run the icon codemod on the folder, then hand-fix what it reported (component-reference icons become `IMIconName` strings).
2. Text: every heading becomes `IMHeading`/role shortcut, every styled `<p>`/`<span>` becomes `IMText`/role, following B's migration table.
3. Controls: raw `<button>`/`<input>`/… become `IM*` primitives. Repeated local patterns become the primitives A added.
4. Colour: raw palette becomes tokens (calendar: 131 sites; `artist-colors.ts` keeps its exemption).
5. RTL: `ml/mr/pl/pr/text-left/right` become logical properties.
6. Local re-implementations of primitives (a feature-local button, chip or empty-state component) are deleted in favour of the `IM*` one.
7. **States**: don't add new behaviour. Do report every view missing a loading skeleton, an empty state or an error state, as a gap for a later pass.

**Learned in Phase 1** (added to every Phase 2 brief):
- Icons passed as component references (`icon: Calendar`, `<item.icon />`, status maps) become `IMIconName` strings; the codemod lists them.
- A spinning `refresh` icon becomes `<IMIcon name="spinner" spin />` (only `spinner` spins).
- Pending-state buttons use `<IMButton loading>` instead of `{isPending && <Loader2/>}`.
- The superseded CSS classes (`btn-native`, `card-native`, `row-native`, `field-native`, `pill`, `tap-target`, `avatar-native`, `auth-*`, `step-*`, `form-label`) map to IM components per `docs/design-system/components.md`; their CSS goes in Phase 3.
- Any footer the Phase 1b reorder skipped: the confirming action goes first.
- Text classes follow the migration table in `docs/design-system/typography.md` literally.

**Removes** (each feature agent, in its folder): ad-hoc heading/text class strings · class-based icon sizing · raw controls · feature-local duplicates of `IM*` primitives, along with their tests and mocks · tests that only asserted removed markup.

---

## 7. Phase 3 — Cleanup (lead)

| Item | Unblocked when | Removes |
|---|---|---|
| 3.1 Legacy icons | `grep -rw` of every `icon-legacy.ts` export finds no caller in `src` or `tests` | `icon-legacy.ts` and its re-export |
| 3.1b Superseded CSS | `ds:audit` components column is 0 | `.btn-native`, `.btn-native-ghost`, `.card-native`, `.row-native`, `.field-native`, `.pill`, `.tap-target`, `.avatar-native`, `.auth-*`, `.step-*`, `.form-label`, `.page-head` rules in `styles.css`; `--text-micro`, `--text-mini`; consider `--text-*: initial` so Tailwind's unused default sizes can't be used |
| 3.2 Font alias | `grep -r "font-assistant" src` is empty | `--font-assistant` in `styles.css` |
| 3.3 Spec mirror | The three pillar pages under `docs/design-system/` are complete | `docs/im-design-system/spec/` |
| 3.4 Final audit | — | — |

Phase 3 exit: `ds:audit` = 0 everywhere, `tsc` clean, all tests pass, `docs/im-design-system/audit.md` regenerated at 0, `walkthrough.md` has before/after screenshots per feature, and CLAUDE.md's standards list links the three pillar pages.

---

## 8. Full-spectrum coverage

1. **Client & UX.** In-CRM: the whole change. Every screen's text, icons and controls move onto the system. Screenshots go in `walkthrough.md` per Phase 1 pillar and per Phase 2 wave, with an RTL, typography and dark-theme audit (CLAUDE.md). WhatsApp agent UX: **no change**, since no customer-facing message, prompt or template is touched.
2. **Business logic & server.** None. Presentation only. Server, hook data logic and integrations are out of every agent's ownership. No locks or concurrency involved.
3. **Database & schema.** None.
4. **External actions.** None required. Both fonts already load from Google Fonts. B only trims weights.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Agents share one working tree | Disjoint ownership, no git for agents, `tsc` filtered to own paths, lead commits per agent |
| Rename codemod collides with a local identifier (e.g. a feature's own `Badge`) | The codemod renames by symbol resolution (TS compiler API), not by text. `tsc` runs right after |
| Typography migration shifts sizes visually | B's migration table makes the choices uniform. Lead screenshots per wave |
| A feature needs a primitive or icon that doesn't exist | Reported as a gap, fixed in `ui/` between waves. Registry seeded from 100% of current usage |
| `IMIcon` default tone overriding button colours | Default tone is `inherit` (decision in C.2) |
