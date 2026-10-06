import * as React from "react"
import { cn } from "@/lib/utils"
import { imControlClasses, imControlText } from "@/components/ui/input"

export type IMTextareaProps = React.ComponentProps<"textarea">

/** Multi-line text entry: notes, descriptions, message drafts. Grows vertically by hand. */
export function IMTextarea({ className, ...props }: IMTextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-22 resize-y px-4 py-3 leading-normal",
        imControlClasses,
        imControlText,
        className
      )}
      {...props}
    />
  )
}
