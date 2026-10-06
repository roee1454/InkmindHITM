# Styling & CSS Standards (Tailwind CSS v4)

Inkmind CRM uses **Tailwind CSS v4** for all application styling. Follow these conventions to keep the UI clean, responsive, and easy to maintain.

---

## 1. Utility-First, Zero Custom CSS

- Write styles exclusively using Tailwind utility classes in JSX `className` props.
- Do not write custom CSS rules or create `.css` files for individual components.
- Global styles belong strictly in `src/styles.css` (e.g. font declarations, CSS custom properties).

---

## 2. Dynamic Class Merging with `cn()`

Always use the `cn()` utility (`@/lib/utils`) when combining conditional classes or accepting external `className` props:
```tsx
import { cn } from '@/lib/utils'

interface CardProps {
  isActive?: boolean
  className?: string
}

export function StudioCard({ isActive, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-colors',
        isActive ? 'border-primary bg-primary/5' : 'hover:border-border/80',
        className
      )}
    />
  )
}
```
`cn()` combines `clsx` (for boolean/conditional maps) and `tailwind-merge` (to ensure conflicting Tailwind classes are resolved properly).

---

## 3. RTL Logical Spacing (Never Hardcode Left/Right)

Because Inkmind CRM is an RTL (Hebrew) application:
- **Margins**: Use `ms-` (margin-inline-start) and `me-` (margin-inline-end) instead of `ml-` / `mr-`.
- **Paddings**: Use `ps-` (padding-inline-start) and `pe-` (padding-inline-end) instead of `pl-` / `pr-`.
- **Text alignment**: Use `text-start` and `text-end` instead of `text-left` / `text-right`.
- **Borders**: Use `border-s-` and `border-e-` instead of `border-l-` / `border-r-`.

---

## 4. Theme Tokens over Magic Colors

Never hardcode arbitrary hex colors like `bg-[#1e1e24]` or `text-[#f5f5f5]`. Always use semantic theme tokens configured in the design system:
- Surfaces: `bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-popover`
- Text: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
- Borders: `border-border`, `border-input`, `border-primary`
- Accents: `bg-primary`, `bg-destructive`, `text-destructive`

