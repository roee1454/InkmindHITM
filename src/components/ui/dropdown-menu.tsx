import * as React from "react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"

import { IMIcon } from "@/components/ui/icon"
import { IM_TYPE_ROLES } from "@/components/ui/typography"
import { cn } from "@/lib/utils"

// Items, sub-triggers: 44px, `radius-inset`, a muted sm icon at the start.
const ITEM = cn(
  IM_TYPE_ROLES.body,
  "relative flex h-11 cursor-pointer select-none items-center gap-2.5 rounded-md px-3 outline-none transition-colors duration-100 data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground"
)

const SURFACE =
  "z-50 min-w-55 origin-(--radix-dropdown-menu-content-transform-origin) rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"

/**
 * Actions on one thing, opened from a `more` button. Items are verb + object ("מחיקת לקוח"); the
 * destructive one goes last, after a separator, and opens a confirm dialog rather than acting.
 */
export function IMDropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

export function IMDropdownMenuTrigger(props: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

export function IMDropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          SURFACE,
          "max-h-(--radix-dropdown-menu-content-available-height) overflow-x-hidden overflow-y-auto",
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export interface IMDropdownMenuItemProps extends React.ComponentProps<typeof DropdownMenuPrimitive.Item> {
  /** Leaves room for a leading icon on items that have none, so labels line up. */
  inset?: boolean
  variant?: "default" | "destructive"
}

export function IMDropdownMenuItem({ className, inset, variant = "default", ...props }: IMDropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        ITEM,
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:data-[highlighted]:bg-destructive/10 data-[variant=destructive]:*:[svg]:text-destructive!",
        className
      )}
      {...props}
    />
  )
}

export function IMDropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(IM_TYPE_ROLES.label, "px-3 py-1.5 text-muted-foreground data-[inset]:ps-9", className)}
      {...props}
    />
  )
}

export function IMDropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1.5 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

/** A keyboard hint at the inline end of an item. */
export function IMDropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(IM_TYPE_ROLES.caption, "ms-auto text-muted-foreground", className)}
      {...props}
    />
  )
}

export function IMDropdownMenuSub(props: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />
}

export function IMDropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(ITEM, "data-[state=open]:bg-surface-2", className)}
      {...props}
    >
      {children}
      {/* The submenu opens toward the inline end — left, in RTL. */}
      <IMIcon name="chevron-end" size="sm" className="ms-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

export function IMDropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(SURFACE, "overflow-hidden", className)}
      {...props}
    />
  )
}
