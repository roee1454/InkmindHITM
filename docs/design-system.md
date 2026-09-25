# Design System & UI/UX Guidelines

Inkmind CRM is designed for professional tattoo studio owners and artists. The interface must feel modern, premium, and distraction-free.

---

## 1. RTL-First (Hebrew as Primary Language)

- The application is natively Hebrew with `dir="rtl"`.
- **Directional conventions**:
  - Always use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) instead of hardcoded `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`.
  - Ensure icons with inherent directionality (arrows, chevrons, send icons) are flipped when appropriate.
  - Numbers and dates should retain natural readable formatting (e.g. `13:00 - 16:00`, `052-705-1611`).

---

## 2. Studio Dark Aesthetic

- Default to a dark, cohesive color scheme:
  - Deep slate/zinc background surfaces (`bg-background`, `bg-card`, `bg-muted`).
  - Subtle borders (`border-border`) with gentle contrasts.
  - Clear semantic accents:
    - **Confirmed / Paid / Active**: Emerald / Green (`text-emerald-400`, `bg-emerald-500/10`)
    - **Pending / In Review / Awaiting Payment**: Amber / Orange (`text-amber-400`, `bg-amber-500/10`)
    - **Cancelled / Error / Destructive**: Rose / Red (`text-rose-400`, `bg-rose-500/10`)
    - **Bot Active**: Violet / Purple (`text-purple-400`, `bg-purple-500/10`)

---

## 3. Shadcn UI Component Discipline

- All buttons, dialogs, sheets, form controls, and dropdown menus **must** use the primitives in `src/components/ui/`.
- Do not reinvent base UI primitives with raw HTML elements (`<button className="...">`) when a Shadcn component (`<Button>`) exists.
- New primitive components must be installed via `pnpm dlx shadcn@latest add <component>` rather than copy-pasting ad-hoc code.

---

## 4. Complete UI State Coverage

Every data-driven view or component must implement all four state variants:
1. **Loading State**: Use animated skeleton placeholders (`<Skeleton>`) that preserve the layout structure, rather than a raw text string like "טוען...".
2. **Empty State**: Clear visual illustration or icon with concise Hebrew copy explaining that no items exist and an optional action button (e.g. "אין עדיין שיחות חדשות").
3. **Error State**: Informative error boundary or error alert with retry button where appropriate.
4. **Interactive / Success State**: Smooth transitions, tactile hover states (`hover:bg-accent`), and clear button loading spinners during async actions.

