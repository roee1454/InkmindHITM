import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { IMIcon } from "@/components/ui/icon"
import { cn } from "@/lib/utils"

export type IMCheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root>

/**
 * A yes/no choice submitted with a form (consent, multi-select). A setting that applies at once is
 * an IMSwitch. Wrap it and its text in one `<label>` so the whole line is the target.
 */
export function IMCheckbox({ className, ...props }: IMCheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer grid size-6 shrink-0 cursor-pointer place-items-center rounded-md border border-border bg-card text-primary-foreground shadow-xs outline-none transition-colors duration-150 ease-native focus-visible:ring-4 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-[state=checked]:border-primary data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-items-center">
        <IMIcon name="check" size="sm" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
