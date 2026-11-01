# IMBadge

A pill that names a state or a category in one or two words.

## Props
- `variant` — the four status roles `new · wait · done · dead`, plus `muted · outline · destructive`. No colour props: a caller never passes a hue.
- `icon` — optional `IMIconName`, rendered `xs`.

## Rules
- `new` is an outline and `dead` a filled grey, so a brand-new lead can't be mistaken for a cancelled appointment.
- `destructive` is for failures (payment failed), never for a passive state like "lost".
- In a dense list prefer `IMStatusLabel`; a column of pills is louder than the data.
- Never nest a badge inside another pill-shaped element.

## Replaces
`Badge`, `.pill`, and ad-hoc `rounded-full px-2 text-xs bg-…` chips in features.
