import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type IMAvatarSize = "sm" | "md" | "lg"
/** The artist identity slot (`artist-1…8`): the same colour the artist has on the calendar. */
type IMAvatarArtist = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

const SIZES: Record<IMAvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10.5 text-base",
  lg: "size-14 text-xl",
}

// Literal class names, so Tailwind sees every one of them.
const ARTIST_RINGS: Record<IMAvatarArtist, string> = {
  1: "ring-artist-1",
  2: "ring-artist-2",
  3: "ring-artist-3",
  4: "ring-artist-4",
  5: "ring-artist-5",
  6: "ring-artist-6",
  7: "ring-artist-7",
  8: "ring-artist-8",
}

/**
 * Two letters: the first letter of the first and of the last word ("דניאל כהן" → "דכ"), or the
 * first two letters of a one-word name. Punctuation is skipped, so a geresh ("ג'וני") never becomes
 * a letter of the monogram.
 */
function monogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word).filter((ch) => /[\p{L}\p{N}]/u.test(ch)))
    .filter((letters) => letters.length > 0)
  const first = words[0]
  const last = words[words.length - 1]
  if (!first || !last) return ""
  const letters = words.length > 1 ? [first[0], last[0]] : first.slice(0, 2)
  return letters.join("").toLocaleUpperCase()
}

export interface IMAvatarProps extends Omit<React.ComponentProps<typeof AvatarPrimitive.Root>, "children"> {
  /** Who it is. Gives the monogram and the accessible name. */
  name?: string
  /** A photo; the monogram shows until it loads, and if it fails. */
  src?: string | null
  size?: IMAvatarSize
  /** A ring in that artist's identity colour. Customers never get one. */
  artist?: IMAvatarArtist
  /** INTERIM: the compound form (IMAvatarImage + IMAvatarFallback) still used by the calendar's
   *  three artist pickers. Phase 2 (calendar) moves them to `src` + `name`; Phase 3 deletes it. */
  children?: React.ReactNode
}

/** A person: their photo when there is one, else a two-letter monogram on `accent-soft`. */
export function IMAvatar({ name, src, size = "md", artist, className, children, ...props }: IMAvatarProps) {
  const label = name?.trim() || undefined
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-accent-soft leading-none font-extrabold text-accent-ink",
        SIZES[size],
        artist && ["ring-2 ring-offset-2 ring-offset-card", ARTIST_RINGS[artist]],
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {src && <AvatarPrimitive.Image src={src} alt="" className="aspect-square size-full object-cover" />}
          <AvatarPrimitive.Fallback data-slot="avatar-fallback">{monogram(name ?? "")}</AvatarPrimitive.Fallback>
        </>
      )}
    </AvatarPrimitive.Root>
  )
}

/** INTERIM (see IMAvatar `children`). */
export function IMAvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  )
}

/** INTERIM (see IMAvatar `children`). */
export function IMAvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn("flex size-full items-center justify-center rounded-full", className)}
      {...props}
    />
  )
}
