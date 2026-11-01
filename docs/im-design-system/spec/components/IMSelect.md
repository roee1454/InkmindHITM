# IMSelect

Pick one from a short, known list. The trigger looks exactly like `IMInput`; the list is an `IMPopover` of 44px items.

## Rules
- Up to ~12 options. Longer or searchable lists use `IMCombobox` (search + list in the popover).
- The selected item shows a `check` at the inline end on `accent-soft`.
- Placeholder is muted and says what to choose ("בחירת מקעקע/ת").
- `IMSelectInput` (native `<select>`) only where the OS picker is better: long numeric ranges on phones.

## Replaces
`Select*`, `SelectInput`.
