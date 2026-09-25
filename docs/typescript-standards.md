# TypeScript Standards & Type Safety

Inkmind CRM enforces strict TypeScript to eliminate runtime bugs and maintain reliable developer ergonomics.

---

## 1. Zero `any` Policy

- The use of `any` is **strictly prohibited** in all production code.
- If the type of a value is truly unknown (e.g. from an external JSON payload or arbitrary error), type it as `unknown` and perform safe runtime narrowing:
  ```ts
  // Bad
  function parseData(payload: any) { ... }

  // Good
  function parseData(payload: unknown) {
    if (typeof payload === 'string') { ... }
  }
  ```
- The only permissible use of `as never` or `as any` is in isolated test mocks within `*.test.ts` files when simulating complex third-party clients.

---

## 2. Type Inference Philosophy

- **Never annotate what TypeScript can infer on its own**:
  ```ts
  // Redundant
  const name: string = 'Daniel'
  const count: number = 0

  // Idiomatic
  const name = 'Daniel'
  const count = 0
  ```
- Never perform arbitrary type casting (`user as AdminUser`) to silence the compiler. If the compiler complains, validate the data structure or use a Type Guard.

---

## 3. Zod at All System Boundaries

All inputs entering the system from untrusted or external boundaries **must** be validated with Zod:
1. **Server Functions**:
   ```ts
   export const updateCustomer = createServerFn({ method: 'POST' })
     .validator(customerUpdateSchema)
     .handler(async ({ data }) => { ... })
   ```
2. **AI Bot Tools**:
   ```ts
   save_client_name: botTool(
     'Description',
     z.object({ fullName: z.string().min(2).max(50) }),
     async ({ fullName }) => { ... }
   )
   ```
3. **Route Search Params**:
   Use `validateSearch: (search) => searchSchema.parse(search)` on TanStack createFileRoute definitions.

---

## 4. Discriminated Unions for Entity States

Model multi-state domain objects (such as appointments, conversation stages, or async results) as discriminated unions rather than single types with multiple optional fields:
```ts
// Good
type AvailabilityResult =
  | { status: 'available'; slots: TimeSlot[] }
  | { status: 'slot_taken'; nextAlternative: TimeSlot }
  | { status: 'studio_closed'; reason: string }
```
This enables TypeScript's exhaustive switch checking and prevents invalid state combinations.

