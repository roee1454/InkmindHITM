# IMDropdownMenu

Actions on one thing, opened from a `more` button: `IMDropdownMenu` with `IMDropdownMenuItem`, `…Label`, `…Separator`, `…Sub`. Free-form floating content uses `IMPopover`.

## Rules
- Items are 44px, `radius-inset`, a muted `sm` icon at the start, a verb + object label ("מחיקת לקוח").
- The destructive item goes last, after a separator, in `destructive` — and opens a confirm dialog rather than acting.
- The surface is `card` with `shadow-overlay` and `radius-card`.

## Replaces
`DropdownMenu*`, `Popover*`.
