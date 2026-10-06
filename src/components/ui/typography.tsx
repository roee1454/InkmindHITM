import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Inkmind Typography Design System
 * 
 * Rules:
 * - Display & Headline: Assistant (800 ExtraBold, tight tracking, line-height 1.2-1.25)
 * - Title, Subtitle, Body, Label, Caption: Open Sans with Assistant fallback
 * - RTL-First: natural text alignment (text-start), no hardcoded text-left/right
 */

const headingVariants = cva(
  "font-assistant tracking-tight text-foreground transition-colors",
  {
    variants: {
      variant: {
        display: "text-3xl font-extrabold leading-tight text-foreground md:text-[29px]",
        headline: "text-2xl font-extrabold leading-tight text-foreground md:text-[23px]",
        title: "text-lg font-bold leading-snug text-foreground md:text-[17px]",
        subtitle: "text-base font-semibold leading-normal text-foreground md:text-[15px]",
      },
      tone: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        accent: "text-primary",
        success: "text-emerald-500 dark:text-emerald-400",
        warning: "text-amber-500 dark:text-amber-400",
        destructive: "text-rose-500 dark:text-rose-400",
      },
    },
    defaultVariants: {
      variant: "title",
      tone: "default",
    },
  }
)

export interface IMHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div"
}

export function IMHeading({
  className,
  variant,
  tone,
  as: Component = "h2",
  ...props
}: IMHeadingProps) {
  return (
    <Component
      data-slot="im-heading"
      className={cn(headingVariants({ variant, tone, className }))}
      {...props}
    />
  )
}

const textVariants = cva(
  "font-body transition-colors",
  {
    variants: {
      variant: {
        body: "text-base font-medium leading-relaxed",
        "body-sm": "text-sm font-medium leading-normal",
        label: "font-assistant text-xs font-bold leading-snug tracking-wide",
        caption: "text-xs font-medium leading-tight",
        micro: "text-micro font-medium leading-none",
      },
      tone: {
        default: "text-foreground",
        muted: "text-muted-foreground",
        accent: "text-primary",
        success: "text-emerald-500 dark:text-emerald-400",
        warning: "text-amber-500 dark:text-amber-400",
        destructive: "text-rose-500 dark:text-rose-400",
      },
      weight: {
        normal: "font-normal",
        medium: "font-medium",
        semibold: "font-semibold",
        bold: "font-bold",
        extrabold: "font-extrabold",
      },
    },
    defaultVariants: {
      variant: "body",
      tone: "default",
    },
  }
)

export interface IMTextProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div" | "label" | "small" | "strong"
}

export function IMText({
  className,
  variant,
  tone,
  weight,
  as: Component = "p",
  ...props
}: IMTextProps) {
  return (
    <Component
      data-slot="im-text"
      className={cn(textVariants({ variant, tone, weight, className }))}
      {...props}
    />
  )
}

/** Specialized semantic typography helpers */
export function IMDisplay(props: Omit<IMHeadingProps, "variant" | "as">) {
  return <IMHeading as="h1" variant="display" {...props} />
}

export function IMHeadline(props: Omit<IMHeadingProps, "variant" | "as">) {
  return <IMHeading as="h1" variant="headline" {...props} />
}

export function IMTitle(props: Omit<IMHeadingProps, "variant"> & { as?: "h2" | "h3" | "h4" | "span" | "div" }) {
  return <IMHeading as="h3" variant="title" {...props} />
}

export function IMSubtitle(props: Omit<IMHeadingProps, "variant"> & { as?: "h3" | "h4" | "h5" | "span" | "div" }) {
  return <IMHeading as="h4" variant="subtitle" {...props} />
}

export function IMLabelText(props: Omit<IMTextProps, "variant">) {
  return <IMText as="label" variant="label" {...props} />
}

export function IMCaption(props: Omit<IMTextProps, "variant">) {
  return <IMText as="span" variant="caption" tone="muted" {...props} />
}
