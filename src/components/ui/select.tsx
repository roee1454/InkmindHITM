import * as React from "react"
import { Select as SelectPrimitive } from "radix-ui"

import { IMIcon } from "@/components/ui/icon"
import { imControlClasses, imControlHeight } from "@/components/ui/input"
import { IM_TYPE_ROLES } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

/**
 * Pick one from a short, known list (up to ~12). The trigger looks exactly like IMInput; the list
 * is a popover of 44px items. Long numeric ranges on phones use IMSelectInput instead.
 */
export function IMSelect({ dir = "rtl", ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" dir={dir} {...props} />
}

export function IMSelectGroup(props: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

export function IMSelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

export interface IMSelectTriggerProps extends React.ComponentProps<typeof SelectPrimitive.Trigger> {
  /** `md` 44/48 (default) · `sm` 40, for toolbars and filters. */
  size?: "sm" | "md"
}

export function IMSelectTrigger({ className, size = "md", children, ...props }: IMSelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "flex cursor-pointer select-none items-center justify-between gap-2 px-4 whitespace-nowrap",
        imControlClasses,
        "data-[placeholder]:text-muted-foreground/70 data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-ring/22",
        size === "md" ? [imControlHeight, "text-base"] : "h-10 text-sm",
        "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <IMIcon name="chevron-down" size="sm" tone="muted" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function IMSelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        align={align}
        {...props}
      >
        <ScrollButton direction="up" />
        <SelectPrimitive.Viewport
          className={cn(
            position === "popper" &&
              "h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <ScrollButton direction="down" />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function IMSelectLabel({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn(IM_TYPE_ROLES.label, "px-3 py-1.5 text-muted-foreground", className)}
      {...props}
    />
  )
}

/** A 44px item (`radius-inset`); the selected one sits on `accent-soft` with a check at the inline end. */
export function IMSelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        IM_TYPE_ROLES.body,
        "relative flex h-11 w-full cursor-pointer select-none items-center gap-2 rounded-md ps-3 pe-9 outline-none transition-colors duration-100 data-[highlighted]:bg-surface-2 data-[state=checked]:bg-accent-soft data-[state=checked]:font-bold data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <span data-slot="select-item-indicator" className="absolute end-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <IMIcon name="check" size="sm" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

export function IMSelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1.5 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function ScrollButton({ direction }: { direction: "up" | "down" }) {
  const Primitive = direction === "up" ? SelectPrimitive.ScrollUpButton : SelectPrimitive.ScrollDownButton
  return (
    <Primitive className="flex cursor-default items-center justify-center py-1">
      <IMIcon name={direction === "up" ? "chevron-up" : "chevron-down"} size="sm" />
    </Primitive>
  )
}
