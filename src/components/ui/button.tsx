import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "#/lib/utils.ts"

const buttonVariants = cva(
  // `active:scale-[0.97]` is the press affordance. Tailwind v4 compiles `hover:` behind
  // `@media (hover: hover)`, so on touch every hover style here is inert — without an active
  // state a tap produces no feedback at all.
  "inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 rounded-2xl font-assistant font-bold whitespace-nowrap outline-none transition-all duration-150 ease-native active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-md active:shadow-sm",
        destructive: "bg-destructive text-destructive-foreground shadow-md active:shadow-sm",
        outline: "border border-border/80 bg-card text-foreground shadow-xs",
        secondary: "bg-muted text-foreground",
        ghost: "text-foreground active:bg-muted",
        link: "text-primary underline-offset-4 active:scale-100 hover:underline",
      },
      size: {
        default: "h-12 px-5 text-base md:h-11 md:text-[15px]",
        lg: "h-14 w-full px-6 text-[17px]",
        sm: "h-10 rounded-xl px-4 text-sm",
        icon: "size-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
