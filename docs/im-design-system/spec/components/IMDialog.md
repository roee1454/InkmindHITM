# IMDialog

A focused task or a confirmation that blocks the page. `IMDialog` is the primitive; `IMResponsiveDialog` (centred on desktop, bottom sheet on phones) is what features use; `IMConfirmDialog` is the preset for "are you sure".

## Rules
- Title is `IMTitle` as a question or a task ("למחוק את התור?", "תור חדש"); description says the consequence.
- Footer: the confirming action first (inline start), cancel second. Destructive confirms use `variant="destructive"` with a specific verb ("מחיקת התור"), never "אישור".
- Close button at the inline-end corner; Escape and the scrim close it unless the dialog holds unsaved input.
- Facts the user is confirming go in a `surface-2` key/value block — not a nested card.

## Replaces
`Dialog*`, `ResponsiveDialog`, `DialogActions`, `ConfirmDialog`.
