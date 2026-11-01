# IMCard

The one raised surface: `IMCard` with `IMCardHeader` (`IMCardTitle`, `IMCardDescription`, `IMCardAction`), `IMCardContent`, `IMCardFooter`, and `IMListRow` for lists inside a card.

## Rules
- Radius `radius-card` (12), 1px `border`, `shadow-raised`, padding 24 (16 on phones).
- **No card inside a card.** Inside a card, group with spacing, a `border` hairline, or `surface-2` — never a second border-and-shadow box.
- Card titles are `IMTitle`; the description is `body-sm` muted.
- A card that is a list (`variant="flush"`) drops its content padding and stacks `IMListRow`s separated by hairlines.
- Footer actions sit at the inline end; one primary at most.

## Replaces
`Card*`, `.card-native`, `.row-native`, and hand-rolled `rounded-xl border bg-card` boxes in features.
