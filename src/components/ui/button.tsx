import * as React from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { Loader2 } from "@/components/ui/icon"
import { imControlHeight } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// An svg child without its own `size-*` class (a legacy glyph) takes the size that matches the
// button: sm 16 in `sm`, md 20 in `md`/`lg`/`icon-sm`, lg 24 in an icon-only toolbar `icon`
// ("Sizes by context", docs/design-system/icons.md). IMIcon sets its own `size-*` and is left alone.
const imButtonVariants = cva(
  // `active:scale-97` is the press affordance. Tailwind v4 compiles `hover:` behind
  // `@media (hover: hover)`, so on touch every hover style is inert and `active` is the only feedback.
  "relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-lg border border-transparent font-bold leading-none whitespace-nowrap outline-none transition-[transform,background-color,box-shadow] duration-150 ease-native active:scale-97 focus-visible:ring-4 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-xs",
        secondary: "bg-surface-2 text-foreground",
        outline: "border-border bg-card text-foreground shadow-xs",
        ghost: "text-foreground hover:bg-surface-2 active:bg-surface-2",
        destructive: "bg-destructive text-destructive-foreground shadow-xs",
        link: "text-accent-ink underline underline-offset-4",
      },
      size: {
        sm: "h-10 gap-1.5 px-4 text-sm [&_svg:not([class*='size-'])]:size-4",
        md: [imControlHeight, "px-5 text-base [&_svg:not([class*='size-'])]:size-5"],
        lg: "h-14 w-full px-6 text-lg [&_svg:not([class*='size-'])]:size-5",
        icon: "size-11 [&_svg:not([class*='size-'])]:size-6",
        "icon-sm": "size-10 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    compoundVariants: [
      // A link sits inside text: no box, no press scale.
      { variant: "link", class: "h-auto px-0 active:scale-100" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

type IMButtonVariant = NonNullable<VariantProps<typeof imButtonVariants>["variant"]>
type IMButtonSize = NonNullable<VariantProps<typeof imButtonVariants>["size"]>

export interface IMButtonProps extends React.ComponentProps<"button"> {
  variant?: IMButtonVariant
  size?: IMButtonSize
  /** Render the single child (a router `<Link>`) with button styling. `loading` is ignored then. */
  asChild?: boolean
  /** In flight: a spinner takes the leading slot and the button is disabled. Pass the in-progress
   *  verb as the label ("שומר…"). On `icon` sizes the spinner replaces the glyph, so the square holds. */
  loading?: boolean
}

/**
 * The one button: every clickable action, from a full-width CTA (`lg`) to an icon-only toolbar
 * control (`icon`, which needs an `aria-label`). One `primary` per view; `destructive` only for the
 * action that destroys.
 */
export function IMButton({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: IMButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const busy = loading && !asChild
  // Phase 1b: <IMIcon name="spinner" spin />, swapped into the `icon` prop's slot.
  const spinner = <Loader2 aria-hidden className="motion-safe:animate-spin" />
  const iconOnly = size === "icon" || size === "icon-sm"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      className={cn(imButtonVariants({ variant, size }), className)}
      {...props}
    >
      {busy ? (
        iconOnly ? (
          spinner
        ) : (
          <>
            {spinner}
            {children}
          </>
        )
      ) : (
        children
      )}
    </Comp>
  )
}
