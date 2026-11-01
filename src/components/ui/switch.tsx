import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

export type IMSwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>

/**
 * An on/off setting that takes effect at once — no save button. 50×30; the thumb travels to the
 * inline end. Pair it with a subtitle and a one-line muted explanation in a settings row.
 */
export function IMSwitch({ className, ...props }: IMSwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-7.5 w-12.5 shrink-0 cursor-pointer items-center rounded-full p-0.75 outline-none transition-colors duration-150 ease-native focus-visible:ring-4 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-2",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-6 rounded-full bg-white shadow-xs data-[state=checked]:ms-auto data-[state=checked]:bg-primary-foreground"
      />
    </SwitchPrimitive.Root>
  )
}
