# MCP assistant — manual testing checklist

Automated coverage (unit tests + the structural consistency guard) lives under
`src/features/mcp-assistant/` as `*.test.ts` files — run with `pnpm test`. This checklist covers
what those tests deliberately don't: does the model pick the right tool for real Hebrew phrasing,
and does the UI actually look/behave right. Not automated, not worth faking.

Before starting: `pnpm db:reset` for a clean slate, then seed whatever scenario a section below
calls for with `pnpm scenario <scenario>` (`busy`, `waitlist-ready`, `outside-24h-window`,
`pending-actions` — see `pocketbase/scripts/seed-mcp-scenarios.py --help` for details, or pass
`--staff-id` through with `pnpm scenario <scenario> -- --staff-id <id>`). `pnpm dev` must be
running for the waitlist sections — the proactive flow depends on the real PocketBase hooks +
internal routes actually firing.

## 1. Read tools — one chat message each, confirm the returned data matches PocketBase

| Tool | Try saying... | Expect |
|---|---|---|
| `list_appointments` | "מה יש לי השבוע?" | List of appointments in range |
| `find_free_slots` | "מתי [אמן] פנוי השבוע?" | Weekly hours + booked slots |
| `search_leads` | "תראה לי לידים חדשים" | Filtered lead list |
| `get_lead` | "תראה לי פרטי הליד של [שם]" | Full lead detail |
| `get_customer` | "תראה לי את הפרטים של [שם]" | Customer + recent appointment history |
| `list_unpaid_deposits` | "מי לא שילם מקדמה?" | Appointments missing a deposit |
| `list_payments` | "כמה הכנסנו החודש?" | Paid-deposit appointments + total |
| `get_business_summary` | "תן לי סיכום של החודש" | Revenue, counts by status, no-show rate |
| `list_waitlist` | "מי ברשימת ההמתנה?" | Waitlist entries with status labels |

## 2. Write tools — propose → approve, confirm the action card diff and the actual mutation

For each, also try **cancel** and **edit** once to confirm those paths still work (not just approve).

| Tool | Try saying... | Confirm after approving |
|---|---|---|
| `reschedule_appointment` | "תעביר את התור של [לקוח] ל[תאריך]" | `start_time` changed on the calendar |
| `cancel_appointment` | "בטל את התור של [לקוח]" | `status: cancelled` |
| `create_appointment` | "תקבע תור ל[לקוח] ביום [תאריך] בשעה [שעה]" | New appointment appears on the calendar |
| `mark_appointment_status` | "סמן שהתור של [לקוח] הושלם" / "לא הגיע" | `status` updated |
| `update_lead_stage` | "תעביר את [שם] לשלב תשלום מקדמה" | `lead_stage` changed on the leads board |
| `add_customer_note` | "תוסיף הערה ל[לקוח]: התקשרה לגבי מועד" | Note prepended, old notes preserved |
| `send_reminder` | "תשלח תזכורת ל[לקוח] על המקדמה" | WhatsApp message actually sent |
| `send_update_message` | "תעדכן את [לקוח] שהתור זז" | WhatsApp message actually sent |
| `request_review` | "תבקש מ[לקוח] ביקורת" | WhatsApp message actually sent |
| `add_to_waitlist` | "תוסיף את [לקוח] לרשימת המתנה למועד מוקדם" | New `watching` waitlist entry |
| `remove_from_waitlist` | "תוריד את [לקוח] מרשימת ההמתנה" | Entry set to `cancelled` |

## 3. Action-card state machine (pick any one write tool above)

- [ ] Approve → card shows `done`, undo button appears
- [ ] Undo within the 5-minute window → card shows `cancelled`
- [ ] Wait past the undo window (or fake it) → undo button gone
- [ ] Cancel a pending action → card shows `cancelled`, no mutation happened
- [ ] Edit a pending action's fields → save → new diff reflects the edit → approve → mutation matches the *edited* values, not the original

## 4. Full waitlist flow (seed `pnpm scenario waitlist-ready` first)

1. [ ] Confirm the seed script's cancellation fired the hook — a **new conversation** appears for
       the staff member, started by the assistant with no preceding message, plus a green/amber
       dot on the floating bubble (the panel doesn't need to be open for this).
2. [ ] Open it — an `offer_waitlist_slot` action card is waiting. Approve it.
3. [ ] Confirm the WhatsApp message actually sent to the waiting customer's number.
4. [ ] Reply to the assistant in chat as if relaying the customer's answer: "דנה אישרה".
       Confirm it calls `record_waitlist_response` and then proposes a `create_appointment`
       action pre-filled with the freed slot — this is the *separate*, final approval.
5. [ ] Approve that — confirm the new appointment actually appears on the calendar, and the old
       later appointment (or the waitlist entry) reflects the resolution.
6. [ ] Repeat from step 2 with a **decline** instead ("דנה לא רוצה") — confirm the entry is
       marked declined and, if another matching candidate exists, a fresh offer is proposed
       automatically in the same conversation.

## 5. Outside-24h-window path (seed `pnpm scenario outside-24h-window` first)

- [ ] Approve `send_reminder`/`send_update_message`/`offer_waitlist_slot` for the seeded
      customer — confirm the action surfaces "חלון 24 השעות" instead of a raw Graph error, and
      the action rolls back to `pending` (not stuck on `executing`).

## 6. Chat feed UI (redesigned earlier — regression-check after any future UI change)

- [ ] RTL holds throughout (staff bubble on the right, assistant text right-aligned, code/JSON
      blocks forced LTR)
- [ ] Assistant answers render markdown (bold, lists, links, code)
- [ ] Sending a message shows it immediately (not only after the reply arrives)
- [ ] Closing the panel mid-request, then reopening — bubble showed the in-flight spinner while
      closed, and the completed answer is there on reopen
- [ ] Green "unread answer" dot clears on opening the conversation; amber "pending action" dot
      takes priority when both are true

## Bug-fix workflow

When a bug turns up here (or from a user report):

1. Reproduce it as a failing unit test first if it's in a unit-testable layer (matcher logic,
   commit-function mutations, tool routing, prompt content — see the `*.test.ts` files under
   `src/features/mcp-assistant/`). If it's LLM-phrasing or UI-level, add/extend a line above or a
   scenario in `seed-mcp-scenarios.py` instead so it's reproducible on demand.
2. Fix it.
3. Re-run `pnpm exec tsc --noEmit && pnpm lint && pnpm test` before considering it done.
4. Name the regression test after what it guards (e.g. a short comment referencing the bug), the
   same way `src/integrations/ai/prompts.test.ts` references `LANG-1`/`LANG-2` — so a future
   reader knows *why* the test exists, not just what it asserts.

