# IMText

The text roles: every piece of text in the app is one of nine roles, rendered by `IMHeading` (display → subtitle) or `IMText` (body → micro).

## Roles
| Role | Component | Face | Size / line | Weight | Use for |
|---|---|---|---|---|---|
| display | `IMDisplay` | Assistant | 28 / 1.2 | 800 | One hero figure per screen: dashboard total, onboarding question |
| headline | `IMHeadline` | Assistant | 23 / 1.25 | 800 | The page title; full-screen sheet titles |
| title | `IMTitle` | Open Sans | 17 / 1.45 | 700 | Card headers, section titles, dialog and sheet titles |
| subtitle | `IMSubtitle` | Open Sans | 15 / 1.5 | 600 | Sub-sections, a row's primary line (a customer's name) |
| body | `IMText` | Open Sans | 15 / 1.5 | 500 | Running text, notes, chat bubbles |
| body-sm | `IMText variant="body-sm"` | Open Sans | 13.5 / 1.4 | 500 | Descriptions, a row's second line, help text |
| label | `IMLabel` | Open Sans | 13.5 / 1.4 | 700 | Form labels and key/value keys |
| caption | `IMCaption` | Open Sans | 12.5 / 1.3 | 500 | Timestamps, footnotes, badges, status labels |
| micro | `IMText variant="micro"` | Open Sans | 11 / 1.25 (12 on touch) | 600 | Nav counters, dense calendar chips |

## Props
- `variant` — the role. `as` — the semantic element, independent of the look (`<IMTitle as="h2">`).
- `tone` — `default · muted · accent · success · warning · destructive · inherit`. Status tones only for system outcomes.
- `numeric` — tabular figures and bidi isolation, for money, phone numbers and time ranges inside Hebrew.
- `weight` — only to emphasise a word inside body text (`semibold`, `bold`); never to fake another role.

## Rules
- Assistant appears in two roles only (display, headline). Everything else is Open Sans.
- No `uppercase`, no `tracking-*` — Hebrew has no case, and letter-spacing breaks its letterforms.
- `text-start` / `text-end` only; never `text-left` / `text-right`.
- Don't size text with Tailwind classes in features. Pick a role; if none fits, the role set is wrong — raise it.

## Replaces
`font-assistant` (99 call sites, which rendered Open Sans anyway), raw `<h1>`–`<h6>`, `<p className="text-sm …">`, the `.auth-title` / `.auth-sub` / `.step-question` / `.step-hint` / `.page-head h1` / `.form-label` classes, and the `text-micro` / `text-mini` / `text-2xs` overlap.
