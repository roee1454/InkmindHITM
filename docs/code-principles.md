# Code Principles & Engineering Hygiene

These principles govern all code written in Inkmind CRM to maintain high quality, readability, and long-term maintainability.

---

## 1. Single Responsibility Principle (SRP)

- Every file and component must have **one clear responsibility**:
  - A **component** renders UI and binds user events.
  - A **hook** manages reusable state and client-side lifecycle.
  - A **server function** validates inputs and coordinates database operations.
  - A **utility module** performs pure data transformation or mathematical computation.
- Avoid "God files" or mixed-concern modules. If a file does database fetching, complex string parsing, and UI rendering all at once, split it immediately.

---

## 2. Component Size Limits (Max ~200–250 LOC)

- When a UI component exceeds **200–250 lines of code**, it is a sign that it is doing too much.
- **Remediation steps**:
  1. Extract sub-components into a co-located `components/` subdirectory (e.g. table rows, card items, modal tabs).
  2. Extract complex state, handlers, or form logic into a custom hook (e.g. `useAppointmentForm.ts`).
  3. Extract static schema definitions or helper formatters to `types.ts` or a helper file.

---

## 3. Pure, Deterministic Logic for Complex Domain Rules

- Complex business algorithms must be isolated in pure, standalone functions with zero side-effects:
  - **Time and Calendar**: `src/lib/time-intervals.ts` handles interval arithmetic using minutes from midnight. No DB calls inside math algorithms.
  - **Sanitization & Security**: `src/lib/sanitization.ts` handles string cleaning without touching global or network state.
  - **Date Formatting**: `src/lib/timezone.ts` and `src/lib/date-utils.ts`.
- Pure functions must always have 100% test coverage with automated unit tests (`*.test.ts`).

---

## 4. Code Hygiene & Maintenance

1. **No Dead Code**: Remove commented-out code blocks, unused variables, and abandoned imports before finishing a task.
2. **Clear JSDoc**: Add concise JSDoc comments to non-trivial functions explaining *why* a decision was made (business context or edge-case rationale), not just *what* the syntax does.
3. **No Premature Optimization / Abstractions**: Do not build abstract frameworks or multi-layered wrappers until a concrete need arises across 3+ distinct use-cases.

---

## 5. Full-Spectrum Planning & Implementation (חוק תכנון רב-מימדי)

Whenever proposing or implementing changes, address all 4 planes:
- **Client & UX**: Visual state, toast alerts, loading/empty/error states, Hebrew RTL, dialogs, bot WhatsApp messaging nuances.
- **Business Logic**: Pure algorithms, server functions, concurrency locks, fallbacks.
- **Database & Schema**: PocketBase collections, field types, indexes, and migrations.
- **External Configuration**: Clear checklist of external console setups (Google Cloud, Meta WhatsApp, Groq, `.env`).

