import * as React from "react"
import { cva } from "class-variance-authority"
import type { VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { IMIcon } from "@/components/ui/icon"
import type { IMIconName, IMIconSize } from "@/components/ui/icon"
import { imControlHeight } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// An svg child without its own `size-*` class (a legacy glyph passed as a child, until Phase 2
// moves it to `icon`) takes the size that matches the button. IMIcon sets its own `size-*`.
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

/** The icon that matches the button ("Sizes by context", docs/design-system/icons.md). */
const ICON_SIZES: Record<IMButtonSize, IMIconSize> = {
  sm: "sm",
  md: "md",
  lg: "md",
  icon: "lg",
  "icon-sm": "md",
}

export interface IMButtonProps extends React.ComponentProps<"button"> {
  variant?: IMButtonVariant
  size?: IMButtonSize
  /** Leading icon, sized to the button and in its colour. On `icon` sizes it is the whole content. */
  icon?: IMIconName
  /** Trailing icon ("המשך" + `chevron-end`). */
  iconEnd?: IMIconName
  /** Render the single child (a router `<Link>`) with button styling. `loading` is ignored then. */
  asChild?: boolean
  /** In flight: the spinner takes the `icon` slot and the button is disabled, so a button with an
   *  icon keeps its width. Pass the in-progress verb as the label ("שומר…"). */
  loading?: boolean
}

/**
 * The one button: every clickable action, from a full-width CTA (`lg`) to an icon-only toolbar
 * control (`size="icon" icon="trash" aria-label="מחיקה"`). One `primary` per view; `destructive`
 * only for the action that destroys.
 */
export function IMButton({
  className,
  variant = "primary",
  size = "md",
  icon,
  iconEnd,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: IMButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const busy = loading && !asChild
  const iconSize = ICON_SIZES[size]
  const lead = busy ? (
    <IMIcon name="spinner" size={iconSize} spin />
  ) : (
    icon && <IMIcon name={icon} size={iconSize} />
  )
  const trail = iconEnd && <IMIcon name={iconEnd} size={iconSize} />
  // An icon-only button that is loading shows the spinner alone, so the square holds.
  const iconOnlyBusy = busy && (size === "icon" || size === "icon-sm")

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
      {/* No wrapping fragment: with `asChild`, Slot must see the Slottable among its direct children. */}
      {lead}
      {!iconOnlyBusy && (asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children)}
      {!iconOnlyBusy && trail}
    </Comp>
  )
}
