# IMButton

The one button: every clickable action in the app, from a full-width CTA to an icon-only toolbar control.

## Props
- `variant` — `primary` (default) · `secondary` · `outline` · `ghost` · `destructive` · `link`.
- `size` — `sm` 40 · `md` 44 desktop / 48 touch (default) · `lg` 56, full width · `icon` square 44 (`sm` + `icon` = 40).
- `icon` / `iconEnd` — an `IMIconName`; rendered at the size that matches the button. Inherits the button colour.
- `loading` — swaps the leading icon for a spinner, keeps the width, disables the button. Label becomes the in-progress verb ("שומר…").
- `asChild` — render a router `<Link>` with button styling.
- Icon-only buttons require `aria-label`.

## When to use which
- One `primary` per view or dialog. A second action is `outline` or `secondary`.
- `ghost` for toolbar and row actions that live on a surface; `link` inside text.
- `destructive` only for the action that destroys (the confirm button of a delete dialog), never for the menu item that opens it.
- `lg` only in auth, onboarding and mobile sheet footers.

## Copy
A verb that says what happens: "שמירה", "שליחה ב-WhatsApp", "מחיקת לקוח". No "אישור"/"OK" when a real verb exists.

## Replaces
`Button`, `buttonVariants`, `.btn-native`, `.btn-native-ghost`, `.tap-target`, and the 156 raw `<button>` elements in features. Controls move from 12px to the 10px `radius-control`.
