import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "#/lib/utils.ts"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-0 p-[3px] transition-colors duration-150 ease-native outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-6 rounded-full bg-white shadow-sm ring-0 transition-transform duration-150 ease-native data-[state=checked]:translate-x-0 data-[state=unchecked]:translate-x-0 data-[state=checked]:ms-auto"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
