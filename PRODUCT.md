# Product
## Register
product

## Platform
web

## Users
Staff of a single tattoo studio — owners, admins, and artists — using the CRM during a working day at the studio: between sessions, at the front desk, or from a phone while away from a computer. Most are not technical, and the tool needs to be operable without training. The job to be done is running the studio's day-to-day: reading and answering customer conversations, keeping the calendar accurate, tracking what stage every piece of work is in, and closing out sessions and projects correctly. There is no separate audience for this UI — the studio's own customers interact only through the WhatsApp bot, never through this interface.

## Product Purpose
Inkmind is booking automation and CRM for a single tattoo studio: WhatsApp-based customer communication, AI-assisted appointment booking, Google Calendar sync, and full project-lifecycle tracking from the first inbound message to a closed, paid project. Success is an interface simple enough that non-technical staff trust it on sight — every screen answers a single, obvious question — and that stays useful and interactive through the entire lifecycle of a project, from the moment an agent opens it to the moment it closes, not just at the booking step.

## Positioning
The one place that turns a WhatsApp message into a tracked, staffed, paid tattoo project, without asking staff to be technical to run it.

## Brand Personality
Professional, quiet, precise. The dark studio aesthetic already in `docs/design-system.md` is deliberate: premium and distraction-free, closer to a serious operator's tool than a consumer app. The interface should disappear into the task the way Linear or Notion do — earned familiarity, not spectacle. Confidence comes from clarity (a screen that never makes staff guess what they're looking at), not from decoration.

## Anti-references
Generic SaaS template aesthetic: recycled hero-metric KPI rows, identical card grids, gradient text, side-stripe accent borders, a "safe" cream/sand body background chosen by default rather than by brand. Also explicitly not [Pencild.co](http://Pencild.co)'s light, card-heavy look (their feature set is close to ours, but the visual register is wrong for a dark, professional studio tool) and not the glassmorphism-by-default look of the Poli-International/studio-crm open-source reference. Nothing here should look like it could be any CRM — it should look like it was built for this one studio's workflow.

## Design Principles
- **Familiarity over novelty.** Staff should trust the interface the way they'd trust Linear or Notion — the bar is "would a user fluent in good tools sit down and trust this," not "does this look impressive."

- **Every screen answers one question.** If a user can't say in one sentence what a page shows, it's doing too much (the original complaint behind this redesign: Leads vs. Projects, Dashboard vs. Analytics).

- **The tool disappears into the task.** No decorative motion, no invented affordances for standard actions — earned, standard patterns everywhere so attention goes to the studio's work, not the software.

- **Restrained color, semantic use only.** Accent and state colors mark actions and status (confirmed / pending / cancelled / bot-active), never decoration. Product register default: Restrained.

- **Interactive across the whole project lifecycle.** The system should stay useful and give staff something to act on from the moment a project opens (a lead) through every stage to the moment it closes — not just at the booking moment.

## Accessibility &amp; Inclusion
RTL-first Hebrew throughout, via logical CSS properties (`ms-`/`me-`/`ps-`/`pe-`/`text-start`/`text-end`), with directional icons flipped where needed — already established in `docs/design-system.md`. No additional WCAG level or accommodation was requested beyond good baseline practice: sufficient contrast (body text ≥4.5:1), visible focus states, and complete interactive states (loading/empty/error) on every data view.