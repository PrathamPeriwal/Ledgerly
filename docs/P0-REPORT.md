# P0 sweep

Confirmed in the current code, then fixed only where an `auth()` check was missing. Ownership gaps, validation gaps, and missing rate limits are listed and were not changed.

`lib/send-email.js` is not an action. It is included because `sendEmail` moved there in this phase.

## Actions

| Function | File:line | Auth check | Record belongs to the user |
| --- | --- | --- | --- |
| `getAccountWithTransactions` | `actions/account.js:18` | Yes (`auth()` at line 19) | Yes. `account.findUnique` uses `id` and `userId` (line 29) |
| `bulkDeleteTransactions` | `actions/account.js:51` | Yes (line 53) | Transactions yes (`userId` at lines 64 and 85). Account balance update is by `id` only (line 95) |
| `updateDefaultAccount` | `actions/account.js:114` | Yes (line 116) | Yes. `account.update` uses `id` and `userId` (line 138). `updateMany` is scoped to `user.id` (line 128) |
| `getUserAccounts` | `actions/dashboard.js:20` | Yes (line 21) | Yes. `account.findMany` uses `user.id` (line 34) |
| `createAccount` | `actions/dashboard.js:54` | Yes (line 56), plus Arcjet | Yes. The new row is stored with `user.id` (line 122). No other user's row is read |
| `getDashboardData` | `actions/dashboard.js:137` | Yes (line 138) | Yes. `transaction.findMany` uses `user.id` (line 151) |
| `createTransaction` | `actions/transaction.js:23` | Yes (line 25), plus Arcjet | Yes. The account is loaded with `id` and `userId` (line 63) before the write |
| `getTransaction` | `actions/transaction.js:107` | Yes (line 108) | Yes. `transaction.findUnique` uses `id` and `userId` (line 118) |
| `updateTransaction` | `actions/transaction.js:129` | Yes (line 131) | The existing transaction yes (`id` and `userId` at line 168). The new `accountId` is not checked |
| `getUserTransactions` | `actions/transaction.js:203` | Yes (line 205) | Yes, after this phase. `userId` on the query is deleted (line 217) and the where clause sets `user.id` last (line 222) |
| `scanReceipt` | `actions/transaction.js:254` | Yes, added this phase (line 256) | No database record |
| `getCurrentBudget` | `actions/budget.js:7` | Yes (line 9) | Budget row yes (`user.id` at line 22). Passed `accountId` is not checked against the user's accounts |
| `updateBudget` | `actions/budget.js:66` | Yes (line 68) | Yes. Upsert is on `user.id` (line 80) |
| `seedTransactions` | `actions/seed.js:45` | Yes, added this phase (line 46) | No. Writes still use hardcoded `USER_ID` / `ACCOUNT_ID` (lines 7–8, 88–100) |

## API handlers

| Handler | File:line | Auth check | Record belongs to the user |
| --- | --- | --- | --- |
| `POST` | `app/api/scan-receipt/route.js:22` | Yes, added this phase (line 24). No user returns 401 | No database record |
| `GET`, `POST`, `PUT` | `app/api/inngest/route.js:11` | No Clerk `auth()`. Inngest `serve()` checks `INNGEST_SIGNING_KEY` when that variable is set. It is not set in the local env file | Not in the handler. Each job loads rows by ids from the event or by scanning all users |

`GET /api/seed` was removed. `actions/seed.js` is still present and is still a server action.

## Not fixed

### Ownership

- `actions/transaction.js:172` — `updateTransaction` spreads the client object into `transaction.update`. `userId` is not overwritten, so the body can move the row to another user after the where clause has matched the caller.
- `actions/transaction.js:182` — the balance update uses `data.accountId` with no check that the account belongs to the caller. The account that was loaded is `originalTransaction.account`, not `data.accountId`.
- `actions/account.js:95` — `bulkDeleteTransactions` updates each account with `where: { id: accountId }` only. The ids come from transactions already filtered by `userId` (line 64), but the account write does not repeat that check.
- `actions/account.js:128` — `updateDefaultAccount` clears every default for the user before the target `update`. If that update throws (missing id, or an id that is not the user's), the caller is left with no default. The flag writes themselves were not changed.
- `actions/budget.js:47` — `getCurrentBudget` filters expenses by the passed `accountId` without loading that account. The same query also sets `userId`, so another user's transactions are not returned.
- `actions/seed.js:88` — after the new auth check, a signed-in caller still `deleteMany`s every transaction for `accountId === "account-id"` and rewrites that account's balance (line 98). The ids are not the caller's.

### Validation

- `actions/dashboard.js:120` — `createAccount` spreads the client object into `account.create`. Only `balance` is checked (line 94).
- `actions/transaction.js:81` — `createTransaction` spreads the client object into `transaction.create`. `userId` is overwritten; other fields are not validated on the server.
- `actions/transaction.js:216` — `getUserTransactions` still applies every other field of `query` as a Prisma `where` filter. Only `userId` is stripped.
- `actions/budget.js:83` — `updateBudget` writes `amount` with no server-side check.
- `actions/account.js:74` — `bulkDeleteTransactions` adds Prisma `Decimal` amounts with `+` and does not call `toNumber()`.
- `app/api/scan-receipt/route.js:82` — model text is `JSON.parse`d with no guard around the parse. A bad payload becomes the 500 from the outer `catch`. The action path already guards its parse.
- `lib/send-email.js:9` — `to` is passed to Resend with no check.

### Rate limits

Arcjet `tokenBucket` in `lib/arcjet.js` is called only from `createAccount` (`actions/dashboard.js:63`) and `createTransaction` (`actions/transaction.js:32`). These writes and paid calls have no limiter:

- `actions/transaction.js:254` `scanReceipt`
- `app/api/scan-receipt/route.js:22` `POST`
- `actions/transaction.js:129` `updateTransaction`
- `actions/account.js:51` `bulkDeleteTransactions`
- `actions/account.js:114` `updateDefaultAccount`
- `actions/budget.js:66` `updateBudget`
- `actions/seed.js:45` `seedTransactions`
- `lib/send-email.js:3` `sendEmail`

Reads (`getUserAccounts`, `getDashboardData`, `getTransaction`, `getUserTransactions`, `getAccountWithTransactions`, `getCurrentBudget`) also have no limiter.

### Inngest route

`app/api/inngest/route.js:11` was not given a Clerk `auth()` check. The handler is invoked by Inngest, not by a signed-in user. Adding that check would reject the job runner. The local env file has no `INNGEST_SIGNING_KEY`, so signing is not configured in this workspace.
