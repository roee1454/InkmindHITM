# IMEmptyState

What a view shows when it has nothing to show: a filled `xl` icon in a `surface-2` disc, an `IMTitle`, one muted sentence, and at most one action.

**Intentional addition.** There is no shared primitive for this today, but `docs/design-system.md` requires an empty state on every data view, and features hand-roll it. The icon names the missing thing (`users`, `kanban`, `chat`), not a generic "inbox".

## Copy
Say why it's empty and what to do next. Filtered-empty ("אין לקוחות שמתאימים") offers to clear the filter; first-run empty ("עדיין אין פרויקטים") offers to create one.
