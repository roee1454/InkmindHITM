# Inkmind Design System & UI/UX Guidelines

Inkmind CRM is designed for professional tattoo studio owners and artists. The interface must feel modern, premium, tactile, and distraction-free.

---

## 1. RTL-First (Hebrew as Primary Language)

- The application is natively Hebrew with `dir="rtl"`.
- **Directional conventions**:
  - Always use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) instead of hardcoded `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`.
  - Ensure icons with inherent directionality (directional arrows, back/forward carets, send icons) respect RTL orientation.
  - Numbers, monetary amounts, and time ranges retain natural readable formatting (e.g. `13:00 - 16:00`, `₪800 - ₪1,200`, `052-705-1611`).

---

## 2. Monochrome Studio Aesthetic & Color Palette (Black & White)

- Inkmind CRM is built on a strict **monochrome palette** inspired by tattoo ink and canvas:
  - **Dark Mode (Default)**: Deep near-black background (`bg-background` / `#0a0a0b`), elevated zinc surfaces (`bg-card` / `#141415`), white text (`text-foreground` / `#ffffff`), and solid white primary controls (`bg-primary` / `#f4f4f5` with `#18181b` text).
  - **Light Mode**: Crisp white/light-slate background (`#f3f5f9`), white cards (`#ffffff`), dark ink text (`#12151c`), and solid near-black primary controls (`#18181b` with white text).
  - **No Decorative Accent Colors**: Zero arbitrary orange, amber, or bright decorative tints. All brand surfaces, tabs, and interactive focal points remain strictly black-and-white.
  - **Functional Status Roles**: Subtle and reserved strictly for system outcomes (done/confirmed, error/destructive).

---

## 3. The IM system — one page per pillar

Every shared component lives in `src/components/ui/` and is `IM*`-prefixed (IM = Inkmind): components, hooks and props types alike (`IMButton`, `useIMToast`, `IMButtonProps`). There are no unprefixed aliases. Features compose these parts and never restyle them.

| Pillar | Page | Covers |
|---|---|---|
| Components | [design-system/components.md](design-system/components.md) | Every `IM*` primitive: purpose, when (not) to use, props, the overlay decision table |
| Typography | [design-system/typography.md](design-system/typography.md) | Assistant + Open Sans, the nine text roles, Hebrew rules, the class → role migration table |
| Icons | [design-system/icons.md](design-system/icons.md) | The closed `IMIcon name=` registry, the always-filled rule, sizes and tones |

Shared vocabulary on every component: `variant` (visual style) · `size` (`sm · md · lg`) · `tone` (`default · muted · accent · success · warning · destructive · inherit`, from `src/components/ui/tones.ts`).

The approved target, with live renditions of every component: [im-design-system/spec/](im-design-system/spec/README.md). `pnpm ds:audit` reports what in the app still breaks the rules in `eslint/design-system/`.

---

## 4. Complete UI State Coverage

Every data-driven view or component must implement all four state variants:
1. **Loading State**: Use animated skeleton placeholders (`<IMSkeleton>`) that preserve the layout structure, rather than a raw text string like "טוען...".
2. **Empty State**: Clear visual illustration with filled icon (`<IMIcon size="xl" tone="muted" />`) and concise Hebrew copy explaining that no items exist and an optional action button (e.g. "אין עדיין שיחות חדשות").
3. **Error State**: Informative error boundary or error alert with retry button where appropriate.
4. **Interactive / Success State**: Smooth transitions, tactile hover states (`hover:bg-accent`), and clear button loading spinners during async actions.
