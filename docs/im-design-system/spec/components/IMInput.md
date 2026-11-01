# IMInput

Text entry: `IMInput`, `IMTextarea`, and `IMField` (label + control + help or error), which wires `IMLabel` and ids for you.

## States
default · focus (border `primary` + 4px `ring` halo) · invalid (`destructive` border, error line with a `warning-circle` icon) · disabled (50%).

## Rules
- Height 44 desktop, 48 on touch; text 15, **16 on touch** so iOS never zooms on focus.
- Every input has a visible `IMLabel` — a placeholder is an example value, never the label.
- Help text sits under the control in `body-sm` muted; an error replaces it and says how to fix it.
- Phone, email, URL and money inputs are `dir="ltr"`, and their placeholder is the bare example ("054-765-4321"): Hebrew inside an LTR field renders scrambled ("למשל:" jumps to the wrong end).

## Replaces
`Input`, `Textarea`, `Label`, `Form*` field parts, `.field-native`, `.form-label`, `.form-stack`.
