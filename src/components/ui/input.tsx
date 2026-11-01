import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * The surface every entry control shares — IMInput, IMTextarea, IMSelectInput, the IMSelect /
 * IMDatePicker / IMHourPicker triggers and IMSearchInput — so a picker trigger reads exactly like
 * an input. Radius is `radius-control` (rounded-lg, 10), depth `shadow-raised`, focus a 4px halo.
 */
export const imControlClasses =
  "w-full min-w-0 rounded-lg border border-border bg-card font-medium text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150 ease-native placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-ring/22 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/14 disabled:cursor-not-allowed disabled:opacity-50"

// Height and text size go through variables that only the pointer media query changes, so a
// caller's plain `h-9` or `text-sm` replaces the default on every device (tailwind-merge drops the
// `h-(…)` / `text-(…)` class; a `pointer-coarse:h-12` would have survived and won on touch).

/** 44 on desktop, 48 on touch. */
export const imControlHeight =
  "h-(--im-control-h) [--im-control-h:calc(var(--spacing)*11)] pointer-coarse:[--im-control-h:calc(var(--spacing)*12)]"

/** 15px (`text-base`), and on touch the 16px floor (1rem) below which iOS zooms into a focused field. */
export const imControlText =
  "text-(length:--im-control-fs) [--im-control-fs:var(--text-base)] pointer-coarse:[--im-control-fs:1rem]"

/** No `children`: `<input>` is a void element, and React throws at render if it gets any. */
export type IMInputProps = Omit<React.ComponentProps<"input">, "children">

/** Single-line text entry. Phone, email, URL and money fields pass `dir="ltr"`. */
export function IMInput({ className, type, ...props }: IMInputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("flex px-4", imControlClasses, imControlHeight, imControlText, className)}
      {...props}
    />
  )
}
