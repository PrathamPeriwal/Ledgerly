# Architecture

Layers (each imports only from the ones below it):

- `actions/` - thin `"use server"` wrappers. Parse input, call `requireUser()`, call a service, `revalidatePath`, return `{ success, data }` or `{ success: false, error }`.
- `lib/services/` - writes and business rules (`transactions.ts`, `accounts.ts`, `budget.ts`). `balance.ts` holds the pure balance math (Prisma.Decimal); `apply-deltas.ts` applies it inside a `prisma.$transaction`.
- `lib/data/` - reads for server components (`account.ts`, `dashboard.ts`, `transaction.ts`).
- `lib/validation/` - zod schemas. `*Schema` is the client form schema, `*InputSchema` is the stricter server schema.
- `lib/auth/` - `requireUser()` (throws `UnauthorizedError`) and the Arcjet rate limit. `lib/errors.ts` maps errors to the failure shape.

Request flow for a mutation: form -> action -> `requireUser` -> `safeParse` (first issue becomes the error) -> service -> one `$transaction` (row write plus balance deltas, every query filtered by `userId`) -> `revalidatePath` -> `{ success, data }`. A foreign id behaves like a missing one ("Not found"). Unexpected errors are logged with `[actionName]` and returned as a generic message.

Adding an action: add the schema to `lib/validation/`, the write to `lib/services/` (take `userId`, put it in every `where`, use `$transaction` if more than one write), then a wrapper in `actions/` following `actions/transaction.ts`. Add a mocked test in `tests/actions.test.ts`.
