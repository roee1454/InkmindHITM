# IMToast

A short, self-dismissing report of something that just happened: `useIMToast().show({ tone, title, description?, action? })`, mounted once by `IMToastProvider`.

## Rules
- `tone` sets the leading icon only (`success` check-circle, `destructive` warning-circle, `default` for news). The surface stays `card`.
- Title in past tense for outcomes ("הפרטים נשמרו"); errors say what failed and what to do.
- Never a toast for something the user must act on — that's a dialog or an inline message.

## Replaces
`ToastProvider`, `useToast`.
