# IMDatePicker

Date and time entry: `IMDatePicker` (trigger + `IMCalendar` in a popover) and `IMHourPicker` (trigger + a scrolling list of slots).

## Rules
- Triggers are styled as `IMInput` with a muted leading icon (`calendar`, `clock`) and a trailing `chevron-down`.
- The week starts on Sunday (א). Today has a ring; the selected day is `primary`; a dot marks days that already have appointments.
- Dates read as Hebrew words ("יום ד׳, 14 באוקטובר"); times are tabular and LTR-isolated.
- Month arrows use `chevron-start` / `chevron-end`, which the registry mirrors for RTL.

## Replaces
`DatePicker`, `HourPicker`, `Calendar`.
