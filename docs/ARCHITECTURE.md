# Architecture

Layers (each imports only from the ones below it):

- `actions/` - thin `"use server"` wrappers. Parse input, call `requireUser()`, call a service, `revalidatePath`, return `{ success, data }` or `{ success: false, error }`.
- `lib/services/` - writes and business rules (`transactions.ts`, `accounts.ts`, `budget.ts`). `balance.ts` holds the pure balance math (Prisma.Decimal); `apply-deltas.ts` applies it inside a `prisma.$transaction`.
- `lib/data/` - reads for server components (`account.ts`, `dashboard.ts`, `transaction.ts`).
- `lib/validation/` - zod schemas. `*Schema` is the client form schema, `*InputSchema` is the stricter server schema.
- `lib/auth/` - `requireUser()` (throws `UnauthorizedError`) and the Arcjet rate limit. `lib/errors.ts` maps errors to the failure shape.

Request flow for a mutation: form -> action -> `requireUser` -> `safeParse` (first issue becomes the error) -> service -> one `$transaction` (row write plus balance deltas, every query filtered by `userId`) -> `revalidatePath` -> `{ success, data }`. A foreign id behaves like a missing one ("Not found"). Unexpected errors are logged with `[actionName]` and returned as a generic message.

Adding an action: add the schema to `lib/validation/`, the write to `lib/services/` (take `userId`, put it in every `where`, use `$transaction` if more than one write), then a wrapper in `actions/` following `actions/transaction.ts`. Add a mocked test in `tests/actions.test.ts`.

## Background jobs

Inngest functions live in `lib/inngest/functions.ts` and are served at `/api/inngest`. Cron times are UTC.

| Function | Schedule | What it does |
| --- | --- | --- |
| `trigger-recurring-transactions` | `0 0 * * *` (daily) | Finds due recurring transactions and fans out one `process-recurring-transaction` event each |
| `check-budget-alerts` | `0 */6 * * *` (every 6 hours) | Fans out one `process-budget-alert` event per budget over its threshold |
| `generate-monthly-reports` | `0 0 1 * *` (1st of the month) | Fans out one `process-monthly-report` event per user with last month's transactions |
| `demo-reset` | `0 20 * * *` (20:00 UTC, 01:30 IST) | Restores the demo ledger. The daily run also keeps the free-tier database from pausing |

The per-item functions (`process-*`) are event-driven, retried, and do the real work, so one failing user never blocks the rest.

## Keeping the free database awake

The free database pauses when nothing talks to it. Three things keep it awake: the nightly demo reset (Inngest `demo-reset`), a health ping every 3 days, and ordinary use of the app.

`GET /api/health` counts the budget table and returns `{ ok: true }` with no rows. GitHub Actions calls it on `17 3 */3 * *` (and on demand) via `.github/workflows/keepalive.yml`. The URL is the `SITE_URL` repository variable, or the production site when that variable is empty. Middleware and robots treat `/api/health` like the other `/api` routes (not indexed; `CURL` is allowed so this ping is not stopped as a bot). The route also rate-limits each IP to 30 requests a minute.

## AI

All Gemini calls go through `lib/ai/gemini.ts` (one client factory built on `@google/genai`). `generateWithFallback` tries the chain from `lib/ai/config.ts` (`GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`; defaults `gemini-3.5-flash-lite`, then `gemini-3.6-flash`) with a real AbortSignal per attempt (12 s) and a 24 s total budget for receipts. Receipt calls use minimal thinking. `npm run check:gemini` probes each model once.

- Receipt scan (`app/api/scan-receipt/route.js`): image in, structured JSON out (JSON schema with a category enum), 25 s timeout. Arcjet limits per user, per IP and for the shared demo, plus Clerk auth, run before any model call.
- Monthly insights (`lib/services/monthly-report.ts`): text only, 20 s timeout, two attempts, then three plain sentences built from the stats.

Evidence for the choices (read 24 Oct 2026):

- SDK: the Gemini libraries page marks the legacy `@google/generative-ai` as deprecated (30 Nov 2025, not actively maintained) and recommends `@google/genai`, which is GA. The code was migrated.
- Model: the models page lists `gemini-3.8-flash` as Stable with image input and structured outputs. `gemini-2.5-flash` is not deprecated, but access is limited to existing users and the page recommends 3.5 Flash-Lite or 3.8 Flash for new work. `gemini-3.6-flash` is the previous Stable Flash and is the fallback to try via `GEMINI_MODEL`.
- Live check: during the B4a session the Gemini API answered 503 ("high demand") for `gemini-3.8-flash` and for `gemini-3.6-flash`, so the end-to-end scan result was not confirmed. Unit tests cover the request shape.

## Decisions

- **SQL aggregation.** Dashboard and account totals are grouped queries in Postgres, not rows summed in JavaScript.
- **Atomic balances.** A transaction row and its account balance change happen in one `$transaction` using increments, never read-modify-write.
- **One monthly budget.** Each user has a single monthly budget per account; the pace view reads it directly.
- **Fan-out jobs.** Cron functions only enumerate work and send events; per-item functions do the work with their own retries.
- **`sin1` region.** `vercel.json` pins functions to Singapore, next to the database, to keep query latency low.
- **Security headers.** `next.config.js` sets nosniff, a strict referrer policy, frame denial and a camera-only permissions policy. No Content-Security-Policy, because Clerk and Next inline scripts would make it fragile.
