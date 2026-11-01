# IMSheet

A panel that slides in from an edge: bottom on phones (with a drag handle), the inline-end side on desktop. For a form or detail view that keeps the page in context.

## Rules
- Header: `IMTitle` + one muted line. Body scrolls; footer stays pinned with the primary action `lg` and full width on phones.
- Bottom sheets round only their top corners (`radius-card`) and respect the safe-area inset.
- One sheet at a time; a sheet never opens another sheet — use a dialog.

## Replaces
`Sheet*`.
