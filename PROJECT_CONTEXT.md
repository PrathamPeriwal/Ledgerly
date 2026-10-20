# Ledgerly — project context

Audit of the repo as it exists on disk. Claims cite paths in this repository. `Codebase_Context.md` was not modified. Secrets are not included; only environment variable names.

Package versions below are the specifiers in `package.json` (ranges, except `next`, which is pinned). Lockfile resolutions were not used.

---

## 1. Stack & versions

| Concern | Package | `package.json` specifier |
| --- | --- | --- |
| Framework | `next` | `15.4.10` (exact) |
| UI | `react`, `react-dom` | `^19.0.0-rc-66855b96-20241106` (release candidate, not stable 19) |
| ORM | `prisma`, `@prisma/client` | `^6.0.1` |
| Auth | `@clerk/nextjs` | `^6.6.0` |
| Jobs | `inngest` | `^3.27.4` |
| Bot / rate limit | `@arcjet/next` | `^1.0.0-alpha.34` |
| CSS | `tailwindcss` | `^3.4.1` (dev) |
| Tailwind animate | `tailwindcss-animate` | `^1.0.7` |
| PostCSS | `postcss` | `^8` (dev) |
| CSS inlining | `critters` | `^0.0.23` (used by `experimental.optimizeCss` in `next.config.js`) |
| Radix | `@radix-ui/react-checkbox` `^1.1.2`, `react-dialog` `^1.1.2`, `react-dropdown-menu` `^2.1.2`, `react-popover` `^1.1.2`, `react-progress` `^1.1.0`, `react-select` `^2.1.2`, `react-slot` `^1.1.0`, `react-switch` `^1.1.1`, `react-tooltip` `^1.1.4` | see left |
| shadcn helpers | `class-variance-authority` `^0.7.1`, `clsx` `^2.1.1`, `tailwind-merge` `^2.5.5`, `lucide-react` `^0.462.0` | `components.json` style `new-york`, `tsx: false` |
| Drawer | `vaul` | `^1.1.1` |
| Forms | `react-hook-form` `^7.53.2`, `@hookform/resolvers` `^3.9.1`, `zod` `^3.23.8` | |
| Dates | `date-fns` `^4.1.0`, `react-day-picker` `^8.10.1` | |
| Charts | `recharts` | `^2.14.1` |
| Email | `resend` `^4.0.1`, `@react-email/components` `^0.5.0`, `react-email` `^4.2.8` (dev) | |
| AI | `@google/generative-ai` | `^0.24.1` (model string in code: `gemini-2.5-flash`) |
| Toasts | `sonner` `^1.7.0` | |
| Theme helper | `next-themes` `^0.4.3` | installed; no `ThemeProvider` in the tree |
| Spinners | `react-spinners` `^0.14.1` | |
| Lint | `eslint` `^8`, `eslint-config-next` `15.0.3` | config is `15.0.3` while Next is `15.4.10` |

**Database.** `prisma/schema.prisma` datasource is `postgresql` with `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`. That pair is the Prisma pooled-URL + direct-URL setup (migrations on `DIRECT_URL`, queries on `DATABASE_URL`). No host, pool size, or `pgbouncer` flag is set in code. `prisma/migrations/migration_lock.toml` provider is `postgresql`.

**Hosting.** No `vercel.json`, Dockerfile, or deploy config. `.gitignore` ignores `.vercel`. README describes a local Next + PostgreSQL app. Nothing in code names Neon, Supabase, or Vercel as the runtime.

**Language.** JavaScript only (`jsconfig.json` path alias `@/*`). No `tsconfig`. shadcn `components.json` has `"tsx": false`.

**Two Next configs.** Installed Next `15.4.10` defines `CONFIG_FILES` as `['next.config.js', 'next.config.mjs', 'next.config.ts']` (`node_modules/next/dist/shared/lib/constants.js`) and loads the first file `findUp` returns (`node_modules/next/dist/server/config.js`). `next.config.js` therefore wins.

- Active (`next.config.js`): `experimental.optimizeCss`, `optimizePackageImports` for `lucide-react` and `@clerk/nextjs`, `compiler.removeConsole` in production, image formats webp/avif, security headers, optional `ANALYZE` webpack stub.
- Inactive (`next.config.mjs`): `images.remotePatterns` for `randomuser.me`, `experimental.serverActions.bodySizeLimit: "5mb"`. Those settings are not applied.

---

## 2. Annotated folder structure

Three levels. One line each. Flags are called out after the tree.

```
ai-finance-platform/
├── actions/                          Server actions ("use server")
│   ├── account.js                    Account page read, bulk delete, set default
│   ├── budget.js                     Read/upsert the single user budget
│   ├── dashboard.js                  List accounts, create account, dump all transactions
│   ├── seed.js                       Dev seeder living in the actions folder
│   ├── send-email.js                 Resend send, no auth
│   └── transaction.js                CRUD, receipt scan, unused getUserTransactions
├── app/
│   ├── (auth)/                       Sign-in / sign-up route group
│   │   ├── layout.js                 Centered glass card around Clerk widgets
│   │   ├── sign-in/[[...sign-in]]/   Clerk <SignIn>
│   │   └── sign-up/[[...sign-up]]/   Clerk <SignUp>
│   ├── (main)/                       Authenticated app chrome (container + padding)
│   │   ├── layout.js                 Page container only; no data fetch
│   │   ├── account/                  /account/[id] + chart and tables
│   │   ├── dashboard/                /dashboard page, layout, cards
│   │   └── transaction/              /transaction/create + form + scanner
│   ├── api/
│   │   ├── inngest/route.js          Inngest serve handler
│   │   ├── scan-receipt/route.js     Second Gemini receipt endpoint (UI does not call it)
│   │   └── seed/route.js             Unauthenticated GET that runs the seeder
│   ├── debug-auth/page.jsx           Public auth debug page
│   ├── lib/schema.js                 Zod schemas (odd path; not under /lib)
│   ├── globals.css                   Tokens, duplicated keyframes, effect classes
│   ├── layout.js                     Root: Clerk, header, footer, forced dark class
│   ├── not-found.jsx                 Client 404
│   └── page.js                       Marketing landing (server component)
├── components/
│   ├── ui/                           shadcn/Radix primitives
│   ├── create-account-drawer.jsx     Client drawer that calls createAccount
│   ├── features-section.jsx          Unused alternate features grid
│   ├── header.jsx                    Async server header; calls checkUser
│   ├── header-client.jsx             Client nav + Clerk buttons
│   ├── hero.jsx                      Client hero with no hooks
│   └── loading.jsx                   Skeleton card + unused full-page spinner
├── data/
│   ├── categories.js                 Category list + color map
│   └── landing.js                    Marketing copy; testimonials unused
├── emails/template.jsx               React Email monthly report + budget alert
├── hooks/use-fetch.js                Client wrapper around server actions + toast
├── lib/
│   ├── inngest/client.js             Inngest client
│   ├── inngest/function.js           Four background functions
│   ├── arcjet.js                     Token-bucket rate limit (accounts + transactions)
│   ├── checkUser.js                  Clerk user → Prisma user upsert-on-read
│   ├── prisma.js                     Prisma singleton (dev global only)
│   └── utils.js                      cn()
├── prisma/
│   ├── schema.prisma                 Models
│   └── migrations/                   PostgreSQL history (currency/categories removed)
├── public/                           icon.png, logo-sm.png, logo.png, banner.jpeg
├── middleware.js                     Arcjet shield+bot, then Clerk
├── next.config.js                    Config that Next actually loads
├── next.config.mjs                   Shadow config (not loaded)
├── package.json
├── tailwind.config.js
├── postcss.config.mjs                tailwindcss plugin only
├── components.json                   shadcn new-york, JS
├── jsconfig.json
├── .eslintrc.json                    next/core-web-vitals, unused-vars warn
└── README.md
```

**Odd placement / duplication**

- `actions/seed.js` is a server action, and `app/api/seed/route.js` exposes it as `GET`. A seeder is not a user action.
- `app/lib/schema.js` holds Zod schemas. README calls `app/lib` “Application schema”. The rest of shared code is in `/lib`.
- `app/debug-auth/page.jsx` is a public route outside `(main)` and outside the Clerk protected matcher.
- `app/(main)/account/_components/no-pagination-transaction-table.jsx` duplicates `transaction-table.jsx` and is imported nowhere.
- `components/features-section.jsx` duplicates the features block in `app/page.js` and is imported nowhere.
- `app/api/scan-receipt/route.js` duplicates `scanReceipt` in `actions/transaction.js`. The form uses the action (`recipt-scanner.jsx`, filename typo).
- `components/ui/sonner.jsx` wraps `next-themes`; `app/layout.js` imports `Toaster` from `sonner` directly.
- `calculateNextRecurringDate` is copied in `actions/transaction.js` and `lib/inngest/function.js`.
- Decimal serialization is copied as `serializeTransaction` (`actions/dashboard.js`) and `serializeDecimal` (`actions/account.js`). `updateDefaultAccount` calls `serializeTransaction`, which is not defined in that file.
- `next.config.js` and `next.config.mjs` disagree (see §1).
- `public/banner.jpeg` and `public/logo.png` have no references. `logo-sm.png` is the favicon link in `app/layout.js`. `icon.png` is the header logo.

There is no `loading.js`, `error.js`, or `global-error.js` anywhere under `app/`.

---

## 3. Routes & pages

Route groups `(auth)` and `(main)` do not appear in the URL. Root layout (`app/layout.js`) wraps every route: `ClerkProvider`, async `Header`, `<main>`, Sonner toaster, footer. `(main)/layout.js` adds a padded container. No route sets `dynamic`, `revalidate`, or `fetchCache`.

| Path | File | RSC / client | Data | loading / Suspense | Layouts |
| --- | --- | --- | --- | --- | --- |
| `/` | `app/page.js` | Server component. Imports client `HeroSection`. | None. Static arrays from `data/landing.js`. | None | Root only |
| `/sign-in` | `app/(auth)/sign-in/[[...sign-in]]/page.jsx` | Server. Renders Clerk `<SignIn>` | Clerk widget (client) | None | Root + `(auth)/layout.js` |
| `/sign-up` | `app/(auth)/sign-up/[[...sign-up]]/page.jsx` | Server. Renders Clerk `<SignUp>` | Clerk widget | None | Root + `(auth)` |
| `/dashboard` | `app/(main)/dashboard/page.jsx` | Async server component | Server actions `getUserAccounts` + `getDashboardData` via `Promise.all`, then `getCurrentBudget` | No `loading.js`. `dashboard/layout.js` wraps an imported `<DashboardPage>` in `<Suspense>` with `LoadingCard` skeletons | Root + `(main)` + `dashboard/layout.js` |
| `/account/[id]` | `app/(main)/account/[id]/page.jsx` | Async server component | Server action `getAccountWithTransactions`. `notFound()` if null | No `loading.js`. Two `<Suspense>` boundaries around `AccountChart` and `TransactionTable` with `BarLoader`. Both children are client components given already-fetched props, so they do not suspend | Root + `(main)` |
| `/transaction/create` | `app/(main)/transaction/create/page.jsx` | Async server component | `getUserAccounts`, then if `?edit=` `getTransaction` | None | Root + `(main)` |
| `/debug-auth` | `app/debug-auth/page.jsx` | `"use client"` | `useAuth` / `useUser` (Clerk client) | None | Root only |
| 404 | `app/not-found.jsx` | `"use client"` (`window.history.back`) | None | n/a | Root |
| `GET/POST/PUT /api/inngest` | `app/api/inngest/route.js` | Route handler | Inngest `serve()` | n/a | Middleware |
| `POST /api/scan-receipt` | `app/api/scan-receipt/route.js` | Route handler | Gemini, no DB | n/a | Middleware |
| `GET /api/seed` | `app/api/seed/route.js` | Route handler | `seedTransactions()` | n/a | Middleware |

**Dashboard layout bug.** `app/(main)/dashboard/layout.js` does not render `{children}`. It imports `./page` and mounts `<DashboardPage />` itself inside Suspense. The App Router page slot is unused.

**Edit page waterfall.** `create/page.jsx` awaits accounts, then awaits the transaction. The two reads do not depend on each other.

---

## 4. Data model

Source: `prisma/schema.prisma`. Tables are mapped to `users`, `accounts`, `transactions`, `budgets`.

### Models

**User** — `id` uuid, `clerkUserId` unique, `email` unique, optional `name`, `imageUrl`, timestamps. Relations: `transactions`, `accounts`, `budgets`.

**Account** — `name`, `type` (`CURRENT` \| `SAVINGS`), `balance` Decimal default 0, `isDefault` bool, `userId` → User `onDelete: Cascade`. Relation: `transactions`.

**Transaction** — `type` (`INCOME` \| `EXPENSE`), `amount` Decimal, optional `description`, `date`, `category` string (not a FK), optional `receiptUrl`, `isRecurring`, optional `recurringInterval`, `nextRecurringDate`, `lastProcessed`, `status` default `COMPLETED`, `userId`, `accountId`. Both FKs cascade.

**Budget** — `amount` Decimal, optional `lastAlertSent`, `userId` **unique** (one budget per user, not per account or category).

### Enums

`TransactionType`, `AccountType`, `TransactionStatus` (`PENDING` \| `COMPLETED` \| `FAILED`), `RecurringInterval` (`DAILY` \| `WEEKLY` \| `MONTHLY` \| `YEARLY`).

Init migration `prisma/migrations/20241204141034_init/migration.sql` also created `BudgetPeriod` and an account `currency` column. Later migrations drop currency and categories. The current schema has neither. `TransactionStatus` is never set to anything but the default in app code. `receiptUrl` is never written.

### Indexes present

| Index | Where |
| --- | --- |
| PK uuid | all models |
| Unique `users.clerkUserId`, `users.email` | User |
| `@@index([userId])` | Account |
| `@@index([userId])`, `@@index([accountId])` | Transaction |
| Unique `budgets.userId` plus redundant `@@index([userId])` | Budget (unique already indexes `userId`) |

### Indexes missing for queries that actually run

| Query | File | Missing index |
| --- | --- | --- |
| `transaction.findMany({ where: { userId }, orderBy: { date: "desc" } })` — full history | `actions/dashboard.js` `getDashboardData` | `(userId, date)` |
| Account include `transactions` `orderBy: { date: "desc" }` | `actions/account.js` `getAccountWithTransactions` | `(accountId, date)` |
| Month aggregate `userId + accountId + type + date range` | `actions/budget.js` `getCurrentBudget`; same shape in `lib/inngest/function.js` `checkBudgetAlerts` | `(userId, accountId, type, date)` or `(accountId, type, date)` |
| `getMonthlyStats`: `userId + date range`, then JS reduce | `lib/inngest/function.js` | `(userId, date)` |
| Cron: `isRecurring: true`, `status: "COMPLETED"`, `lastProcessed` null OR `nextRecurringDate <= now` | `triggerRecurringTransactions` | `(isRecurring, status, nextRecurringDate)`. Today this is a table scan |
| Default account: `userId + isDefault` | budget alert include; `createAccount` / `updateDefaultAccount` | `(userId, isDefault)` |

No `select` is used on any read. Every transaction query returns all columns (`receiptUrl`, `lastProcessed`, `nextRecurringDate`, timestamps, and so on). `getUserTransactions` also `include`s the full `account`.

---

## 5. Server actions & API inventory

No action or route uses `unstable_cache`, `react` `cache()`, or `revalidateTag`. Zod is not imported under `actions/` or `app/api/`. Schemas in `app/lib/schema.js` are only used by client `zodResolver` in the account drawer and transaction form.

Shared pattern: `auth()` from `@clerk/nextjs/server`, then `db.user.findUnique({ where: { clerkUserId } })`, then the real query. That user lookup is repeated in every action on the same request. `checkUser` (`lib/checkUser.js`) does a third lookup via `currentUser()` from the root header and is not shared with actions.

### `actions/dashboard.js`

| Function | Auth | DB calls | Cache / revalidate | Errors | Validation |
| --- | --- | --- | --- | --- | --- |
| `getUserAccounts` | `auth()`, throw if no `userId` | 1 `user.findUnique` + 1 `account.findMany` with `_count.transactions` (Prisma issues a separate count). **2 Prisma calls** | None | `catch` logs and returns `undefined` (does not rethrow) | None |
| `createAccount` | `auth()` + Arcjet `aj.protect` token bucket (`lib/arcjet.js`, 10 / hour, keyed by Clerk `userId`) | 1 user + 1 `account.findMany` (all rows, not a count) + optional `updateMany` + 1 `create`. **3–4 Prisma calls**. Unset-default and create are not one `$transaction` | `revalidatePath("/dashboard")` | `throw new Error(error.message)` | `parseFloat` + `isNaN` on balance only. Body is `{...data}` spread into Prisma. No Zod |
| `getDashboardData` | `auth()` | 1 user + 1 `transaction.findMany` for **every** row of that user, `orderBy date desc`. **2 Prisma calls** | None | Throws "Unauthorized" / "User not found". No try/catch | None |

### `actions/transaction.js`

| Function | Auth | DB calls | Cache / revalidate | Errors | Validation |
| --- | --- | --- | --- | --- | --- |
| `createTransaction` | `auth()` + same Arcjet bucket as account create (shared 10/hour) | 1 user + 1 `account.findUnique` + interactive `$transaction` (insert + account `balance` set to a JS-computed number). **4 Prisma calls** | `revalidatePath("/dashboard")` and ``revalidatePath(`/account/${accountId}`)`` | `throw new Error(error.message)` | None on server. Client Zod only. `{...data}` spread into `create`, then `userId` overwritten |
| `getTransaction` | `auth()` | 1 user + 1 `transaction.findUnique` scoped by `userId`. **2** | None | Throws | `id` argument unchecked |
| `updateTransaction` | `auth()`. **No Arcjet** | 1 user + 1 `findUnique` with `include: { account: true }` + `$transaction` (update + `balance` increment on `data.accountId`). **4** | dashboard + ``/account/${data.accountId}`` | `throw new Error(error.message)` | None on server |
| `getUserTransactions` | `auth()` | 1 user + 1 `findMany` `include: { account: true }`. **2**. Not called by any page | None | `throw new Error(error.message)` | `query` is spread **after** `userId`, so a caller can override `userId` |
| `scanReceipt` | **None** | **0**. New `GoogleGenerativeAI` + `gemini-2.5-flash` every call. No cache | None | Logs raw model text, throws | Checks `GEMINI_API_KEY`, payload shape, empty JSON. No auth, no rate limit, no size check |

`getUserTransactions` returns Prisma objects (Decimal `amount` not converted). Other transaction reads use `serializeAmount`.

### `actions/account.js`

| Function | Auth | DB calls | Cache / revalidate | Errors | Validation |
| --- | --- | --- | --- | --- | --- |
| `getAccountWithTransactions` | `auth()` | 1 user + 1 `account.findUnique` **including every transaction** and `_count`. **2 Prisma calls**, unbounded child rows | None | Throws if logged out / no user. Returns `null` if account missing (page calls `notFound()`) | `accountId` unchecked beyond the `userId` compound where |
| `bulkDeleteTransactions` | `auth()` | 1 user + 1 `findMany` by ids + `$transaction` (`deleteMany` + **one `account.update` per affected account**). **3 + N** | `revalidatePath("/dashboard")` and `revalidatePath("/account/[id]")` — the second argument is the **literal** string `[id]`, not a real account URL | Returns `{ success: false, error }` | Ids not checked for type. Amounts are Prisma Decimals added with `+` (lines 71–76) without `.toNumber()` |
| `updateDefaultAccount` | `auth()` | 1 user + `updateMany` + `update`. **3**. Then calls `serializeTransaction(account)` which **is not defined** in this module (`serializeDecimal` is). Success path throws `ReferenceError` after the writes | `revalidatePath("/dashboard")` | Returns `{ success: false, error }` | None |

### `actions/budget.js`

| Function | Auth | DB calls | Cache / revalidate | Errors | Validation |
| --- | --- | --- | --- | --- | --- |
| `getCurrentBudget` | `auth()` | 1 user + 1 `budget.findFirst` + 1 `transaction.aggregate` for the month and the given `accountId`. **3** | None | Logs and rethrows | None. Budget is per user; expenses are filtered by the passed account |
| `updateBudget` | `auth()` | 1 user + 1 `budget.upsert` on unique `userId`. **2** | `revalidatePath("/dashboard")` | Returns `{ success: false, error }` | None. UI checks `amount > 0`; the action does not |

### `actions/send-email.js`

`sendEmail({ to, subject, react })`. **No auth.** Constructs `new Resend(process.env.RESEND_API_KEY || "")` per call. From address is hardcoded `Finance App <onboarding@resend.dev>`. **0 DB.** No revalidate. try/catch returns `{ success: false, error }`. No validation of `to`. Because the file is `"use server"`, the export is a callable server action, and Inngest also imports it.

### `actions/seed.js`

`seedTransactions`. **No auth.** Builds ~90 days × 1–3 random rows for hardcoded `USER_ID = "user-id"` and `ACCOUNT_ID = "account-id"`. One interactive transaction: `deleteMany` where `accountId`, `createMany`, `account.update` balance. **3 statements inside 1 transaction.** No revalidate. Returns `{ success, message \| error }`.

### API routes

| Route | What | Auth | DB | Cache | Errors | Validation |
| --- | --- | --- | --- | --- | --- | --- |
| `app/api/inngest/route.js` | Registers the four Inngest functions via `serve()` | Inngest signing if `INNGEST_SIGNING_KEY` is present. It is **not** in the local `.env` (name only). Middleware still runs Arcjet + Clerk | Inside the functions, not the handler | None | SDK | SDK |
| `app/api/scan-receipt/route.js` `POST` | Gemini `gemini-2.5-flash` on `{ base64, mimeType }`, `runtime = "nodejs"` | **None.** Not in `isProtectedRoute` | 0 | None. New client every request | 500 JSON `{ error }` | Key presence only. No size cap. `JSON.parse` of model text is unguarded (unlike the action) |
| `app/api/seed/route.js` `GET` | `return Response.json(await seedTransactions())` | **None** | Seeder above | None | Seeder's `{ success: false }` still returns HTTP 200 | None |

---

## 6. Background jobs & integrations

### Inngest

Client: `lib/inngest/client.js`, id `finance-platform`. `retryFunction` returns exponential delay and `maxAttempts: 2`. Handler: `app/api/inngest/route.js`.

| Function | Trigger | Behavior | DB shape |
| --- | --- | --- | --- |
| `triggerRecurringTransactions` | cron `0 0 * * *` (midnight) | Loads every completed recurring row (`isRecurring`, `status: COMPLETED`, `lastProcessed` null **or** `nextRecurringDate <= now`). `inngest.send` one event per row. Comment says “batches”; the code sends the whole array at once | 1 `findMany` of full rows |
| `processRecurringTransaction` | event `transaction.recurring.process`. Throttle 10 / minute / `event.data.userId` | Loads transaction + account. If `isTransactionDue`, `$transaction`: create a non-recurring copy, increment balance, set `lastProcessed` and `nextRecurringDate` | 1 read + 3 writes |
| `generateMonthlyReports` | cron `0 0 1 * *` | All users `include: { accounts: true }`. **Sequential** `for` loop. Per user: `getMonthlyStats` (all transactions that month, reduced in JS), Gemini insight, `sendEmail` | 1 wide user read + **1 findMany + 1 Gemini + 1 email per user** |
| `checkBudgetAlerts` | cron `0 */6 * * *` | `budget.findMany` with user and default account. Per budget, aggregate this month’s expenses on the default account. If `>= 80%` and no alert yet this month, email + `budget.update` `lastAlertSent` | 1 read + **1 aggregate per budget** (+ 1 update when alerting) |

`checkBudgetAlerts` is created with `{ name: "Check Budget Alerts" }` and **no `id`**. The other three functions set `id`. Not executed in this audit.

`isTransactionDue` (`lib/inngest/function.js` lines 303–306) returns `true` when `lastProcessed` is null, before it looks at `nextRecurringDate`. The cron’s `OR` includes every `lastProcessed: null` row. A new recurring transaction whose next date is in the future is still selected and treated as due.

Gemini insights (`generateFinancialInsights`) use `process.env.GEMINI_API_KEY`, model `gemini-2.5-flash`, and `JSON.parse` of stripped markdown. On failure it returns three static strings. No cache. One call per user per month, in series.

### Email

`emails/template.jsx` branches on `type`: `monthly-report` (income, expenses, net, category rows, insight list) and `budget-alert` (percent, budget, spent, remaining). Preview constants `PREVIEW_DATA` are unused by the app. Budget alert data built in the job includes `accountName`; the template never renders it. `percentageUsed.toFixed` is called without a guard.

`npm run email` is `email dev` (React Email preview). Sending always goes through `actions/send-email.js` and Resend’s onboarding sender.

### Receipt scan

UI: `app/(main)/transaction/_components/recipt-scanner.jsx` (client) reads the file, base64-encodes it with `Buffer`, calls server action `scanReceipt`. Client rejects files `> 5MB`. The action calls Gemini with a strict JSON prompt (amount, ISO date, description, merchant, category from a fixed list). Result is applied to the form and then **auto-submitted** (`transaction-form.jsx` `handleScanComplete`, `setTimeout` 100ms + `handleSubmit`).

Parallel unused path: `POST /api/scan-receipt` with a shorter prompt and no auth.

Neither path caches by image hash.

### Arcjet

**Middleware** (`middleware.js`), `createMiddleware(aj, clerk)`, Arcjet first:

- `shield({ mode: "LIVE" })`
- `detectBot({ mode: "LIVE", allow: ["CATEGORY:SEARCH_ENGINE", "GO_HTTP"] })` — comment says `GO_HTTP` is for Inngest
- `characteristics: ["userId"]` is commented out
- Matcher: almost all non-static paths, plus `/api`, `/sign-in`, `/sign-up`

**Action limiter** (`lib/arcjet.js`): `tokenBucket` LIVE, `refillRate: 10`, `interval: 3600`, `capacity: 10`, characteristic `userId`. Comment still says “collection creation”. Called only from `createAccount` and `createTransaction`. Those two writes **share one bucket**. Not applied to scan, update, delete, seed, or the scan API.

### Middleware auth behavior

`isProtectedRoute`: `/dashboard(.*)`, `/account(.*)`, `/transaction(.*)`.

- Signed-in user hitting `/sign-in` or `/sign-up` → redirect `/dashboard`.
- Signed-out user on a protected route → `redirectToSignIn()`.
- `/`, `/debug-auth`, `/api/*` are not in the protected list. API routes still pass through Arcjet bot/shield and Clerk middleware, but the handlers do not check `userId`.

`app/layout.js` also sets Clerk `signInUrl`, `signUpUrl`, and force/fallback redirects to `/dashboard`.

---

## 7. Component inventory

“Lines” is file length from the source read (or non-blank count where noted). None of the client components fetch with `useEffect` + `fetch`. Mutations go through `hooks/use-fetch.js` (`useState` for data/loading/error, `toast.error` on throw).

### `components/`

| File | Kind | Lines | Props / state | Renders |
| --- | --- | --- | --- | --- |
| `header.jsx` | Async server | 10 | none | Awaits `checkUser()` then `<HeaderClient>`. Blocks the root layout (no Suspense) |
| `header-client.jsx` | Client | 100 | Clerk `SignedIn` / `SignedOut` / `UserButton` / `SignInButton` / `SignOutButton`. No local state | Fixed nav, `next/image` `/icon.png` 50×50, dashboard + add-transaction links |
| `hero.jsx` | Client | 252 | **No state, no effects, no handlers** | Marketing hero, fake metrics, infinite CSS animations. Entire section is in the client bundle for no reason |
| `features-section.jsx` | Server | 66 | none | Unused features grid. Classes `glass-card` and `hover-lift` are not defined in CSS or Tailwind |
| `create-account-drawer.jsx` | Client | 190 | `children`. `useState(open)`, `useForm` + `zodResolver(accountSchema)`, `useFetch(createAccount)` | Vaul drawer: name, type, balance, default switch |
| `loading.jsx` | Server | 53 | `LoadingSpinner`, `LoadingCard`, `LoadingPage` | Only `LoadingCard` is used (dashboard skeleton). `LoadingPage` / default spinner are unused |
| `ui/button.jsx` | Server (no `"use client"`) | ~52 | cva variants | shadcn button, `@radix-ui/react-slot` |
| `ui/badge.jsx` | Server | ~35 | cva | Badge |
| `ui/card.jsx` | Server | ~43 | — | Card parts |
| `ui/input.jsx` | Server | ~21 | — | Input |
| `ui/progress.jsx` | Client | 28 | `value`, `extraStyles` | Radix progress. Indicator color is a raw class string |
| `ui/checkbox.jsx` | Client | ~26 | — | Radix checkbox |
| `ui/switch.jsx` | Client | ~27 | — | Radix switch |
| `ui/popover.jsx` | Client | ~29 | — | Radix popover |
| `ui/tooltip.jsx` | Client | ~28 | — | Radix tooltip |
| `ui/select.jsx` | Client | ~150 | — | Radix select |
| `ui/dropdown-menu.jsx` | Client | ~180 | — | Radix dropdown |
| `ui/calendar.jsx` | Client | ~65 | DayPicker props | `react-day-picker` |
| `ui/table.jsx` | Server | ~90 | — | Table parts |
| `ui/drawer.jsx` | Client | ~90 | — | Vaul drawer |
| `ui/sonner.jsx` | Client | 30 | `useTheme()` from `next-themes` | **Unused.** No `ThemeProvider` exists, so `useTheme` would not see a theme if it were mounted |

### Route-level components

| File | Kind | Lines | Props / hooks | What it does |
| --- | --- | --- | --- | --- |
| `app/page.js` | Server | 235 | none | Landing sections. Does not use `FeaturesSection` or `testimonialsData`. Many infinite animations |
| `app/not-found.jsx` | Client | 69 | `window.history.back` | Styled 404 |
| `app/debug-auth/page.jsx` | Client | 98 | `useAuth`, `useUser` | Prints Clerk id, email, name. Force sign-out, `localStorage`/`sessionStorage` clear, cookie wipe |
| `dashboard/page.jsx` | Async server | 73 | — | Composes budget, overview, account cards. If `getUserAccounts` returns `undefined`, `accounts.length` throws (line 59) while `accounts?.find` is guarded |
| `dashboard/_components/budget-progress.jsx` | Client | 154 | `initialBudget`, `currentExpenses`. `useState`, `useFetch(updateBudget)`, two `useEffect` toasts | Editable monthly budget + progress bar. Does not refetch expenses after save (waits on `revalidatePath`) |
| `dashboard/_components/account-card.jsx` | Client | 100 | `account`. `useFetch(updateDefaultAccount)`, `useEffect` | Link to `/account/[id]`, default switch. Income/Expense footer is labels only, not figures |
| `dashboard/_components/transaction-overview.jsx` | Client | 228 | `accounts`, `transactions`. `useState(selectedAccountId)` | Filters **the full transaction array in the browser** to 5 recent rows and a Recharts pie of this month. Imports `PieChart` from `recharts` and also renders `<PieChart className="h-5 w-5">` as if it were an icon (line 167). Hard-coded `text-white` / `slate-*` / `glass-card` (class undefined) |
| `account/[id]/page.jsx` | Async server | 56 | `params` | Header with balance, then chart + table |
| `account/_components/account-chart.jsx` | Client | 170 | `transactions`. `useState(dateRange)`, `useMemo` | Recharts bar chart. Groups by `format(date, "MMM dd")` then sorts with `new Date("MMM dd")` (lines 62–64), which does not preserve year order |
| `account/_components/transaction-table.jsx` | Client | 480 | `transactions`. Many `useState`, `useMemo`, `useFetch(bulkDeleteTransactions)`, `useRouter` | Search, type, recurring filters, sort, checkbox bulk delete, 10-row **client** pagination. `TooltipProvider` is inside each row |
| `account/_components/no-pagination-transaction-table.jsx` | Client | 424 | same | Same table without pagination. **Unreferenced** |
| `transaction/create/page.jsx` | Async server | 38 | `searchParams` | Passes accounts, `defaultCategories`, `initialData` into the form |
| `transaction/_components/transaction-form.jsx` | Client | 336 | `accounts`, `categories`, `editMode`, `initialData`. `useForm` + `transactionSchema`, `useFetch(create\|update)`, `useSearchParams`, `useRouter` | Full transaction form + receipt scanner. Business rules (parse amount, edit vs create, auto-submit scan) live in the component |
| `transaction/_components/recipt-scanner.jsx` | Client | 87 | `onScanComplete`. `useRef`, `useFetch(scanReceipt)`, `useEffect` | File input `capture="environment"`. `Buffer.from` in the browser |

**Large / mixed components**

- `transaction-table.jsx` (~480) and its unused twin (~424): UI, filtering, sorting, and delete side effects in one file.
- `transaction-form.jsx` (~336): form UI plus scan-to-save behavior.
- `hero.jsx` (~252) and `app/page.js` (~235): presentational, but heavy on animation.
- `transaction-overview.jsx` and `account-chart.jsx`: data shaping (aggregation) in the client after the server already loaded every row.
- `dashboard/page.jsx` is a thin server composer; the expensive work is in the actions it calls.

`emails/template.jsx` (~223) is a server-side email component, not a page.

---

## 8. Current design system

**Font.** `Inter` from `next/font/google` in `app/layout.js` (`subsets: ["latin"]`, `display: "swap"`, `preload: true`, CSS variable `--font-inter`). Body uses `inter.className`. Tailwind is not wired to `--font-inter`. `<head>` also preconnects `fonts.googleapis.com` and `fonts.gstatic.com` and dns-prefetches Google Fonts, but no Google stylesheet is loaded. Those hints are extra.

**Dark mode.** `tailwind.config.js` `darkMode: ["class"]`. `<html lang="en" className="dark">` is hardcoded in `app/layout.js`. There is no toggle and `next-themes` is never mounted. Light tokens exist and are unused at runtime because `dark` is always on. Body classes add `bg-gray-50 dark:bg-gray-900`, so the dark gray utilities win over the CSS variables.

**Tailwind.** `tailwind.config.js` content: `pages/`, `components/`, `app/`. Extended colors map to `hsl(var(--…))` for background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1…5. Radius uses `--radius`. Plugin: `tailwindcss-animate`. Custom animations in the config: fade-in, slide-up, slide-down, scale-in, slide-left, slide-right, float, pulse-glow, shimmer, bounce-gentle, gradient-shift. The same keyframes are **copied again** as plain CSS in `app/globals.css`.

**Effects in use.** Utility classes in `globals.css`: `.gradient`, `.gradient-title` (blue→purple clip text), `.gradient-text` (blue/purple/cyan animated), `.card-hover` (lift + shine), `.btn-modern` (ripple), `.icon-hover`, `.glass-effect` (defined, no component uses it), `.parallax` (defined, unused), `.skeleton` (defined, unused; dashboard uses `animate-pulse` divs). Landing and 404 use `bg-gradient-to-br`, blur orbs, `animate-float`, `animate-pulse-glow`, `animate-shimmer`. Receipt button uses `animate-gradient`, which is **not** a defined animation (`animate-gradient-shift` is). `glass-card` / `hover-lift` are used and not defined.

`prefers-reduced-motion` is handled at the bottom of `globals.css` (durations forced to 0.01ms). `will-change: transform, opacity` is set permanently on the animation classes (lines 352–364), so resting animated nodes stay on their own layers.

**shadcn.** `components.json`: style `new-york`, `rsc: true`, `tsx: false`, base color `neutral`, CSS variables on, icon library `lucide`. Installed components: badge, button, calendar, card, checkbox, drawer, dropdown-menu, input, popover, progress, select, sonner, switch, table, tooltip. No `dialog.jsx` even though `@radix-ui/react-dialog` is a direct dependency.

**Icons.** `lucide-react`. Landing also uses emoji. `optimizePackageImports` includes `lucide-react` in the active Next config.

**Animation libraries.** No Framer Motion. CSS + `tailwindcss-animate` + `react-spinners` `BarLoader`.

**Responsiveness.** Tailwind breakpoints `sm` / `md` / `lg` only. `container mx-auto`, padding scales in `(main)/layout.js`. Grids collapse to one column. Header links hide below `md`. No container queries.

**Images.** Only `next/image` usage is `components/header-client.jsx` (`/icon.png`). Favicon is a raw `<link>` to `/logo-sm.png`. `banner.jpeg` and `logo.png` are unused. `next.config.mjs` remote pattern for `randomuser.me` is not loaded; `testimonialsData` (the only consumer) is unused anyway.

### CSS variable block (`app/globals.css`)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222 84% 5.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222 84% 5.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222 84% 4.9%;
    --secondary: 217 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217 32.6% 17.5%;
    --input: 217 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}
```

---

## 9. Performance audit

Nothing in the app sets a cache profile. Personal data is dynamic because actions call `auth()`, which is appropriate. The cost is repeated identical lookups and unbounded row fetches, not missing CDN caching of private ledgers.

### Critical

**1. Root layout waits on Clerk + a DB user read on every route, including `/`.**

`components/header.jsx` lines 4–6 `await checkUser()` with no `<Suspense>`. `lib/checkUser.js` lines 5–16 call `currentUser()` then `db.user.findUnique`. An async server component in the root layout with no Suspense boundary holds the document until that finishes. The landing page has no other data need.

Fix: move `checkUser` off the root layout (run it in `(main)/layout.js` only), or wrap `<Header />` in `<Suspense>`. Wrap the Prisma lookup in `react` `cache()` so the same request does not look the user up again.

**2. Dashboard loads the entire transaction history, three times the user row, then filters in the client.**

`app/(main)/dashboard/page.jsx` lines 12–22:

```js
const [accounts, transactions] = await Promise.all([
  getUserAccounts(),
  getDashboardData(),
]);
// then, after both finish:
budgetData = await getCurrentBudget(defaultAccount.id);
```

`getDashboardData` (`actions/dashboard.js` lines 149–153) is `findMany` with no `take`, `select`, or date filter. `transaction-overview.jsx` lines 45–59 keeps 5 recent rows and the current month. Each of the three actions calls `auth()` and `user.findUnique` again (dashboard.js 21–25 and 138–143, budget.js 9–14). Header may already have loaded the same user.

Critical path is two parallel “auth → user → big read” chains, then a third “auth → user → budget → aggregate”.

Fix: one `getDbUser()` cached with `react` `cache()` for the request. Replace `getDashboardData` with `findMany({ take: 5, orderBy: date, select: {…} })` plus a SQL `groupBy` / aggregate for the month pie. Start the budget aggregate in the same `Promise.all` once the default account id is known (it falls out of the accounts query; do not re-fetch the user). Add `loading.js` under `app/(main)/dashboard`.

**3. Account page sends every transaction to two client components. Suspense does not cover the fetch.**

`actions/account.js` lines 28–40 include all transactions. `app/(main)/account/[id]/page.jsx` lines 10 and 41–53 await that payload, then wrap client children in Suspense. The children receive props; they do not suspend. Client pagination (`transaction-table.jsx` line 58, `ITEMS_PER_PAGE = 10`) slices an array that is already fully loaded. The chart also aggregates that full array in the browser (`account-chart.jsx` lines 35–65).

Fix: paginate in Prisma (`skip`/`take` or cursor) for the table. For the chart, `groupBy` date + type in SQL for the selected range, or pass a pre-aggregated series. Put the fetch in a child inside `<Suspense>` (or add `loading.js`) so the header can paint first. Delete the duplicate no-pagination table.

**4. Receipt bytes go through a server action, and the 5MB body limit is in the config Next does not load.**

`recipt-scanner.jsx` lines 20–34 base64 the whole file with `Buffer` (browser polyfill, extra memory) and call `scanReceipt`. `next.config.mjs` sets `serverActions.bodySizeLimit: "5mb"` but is not the file Next loads (§1). Default Server Action body limit is 1MB, and base64 expands the payload by ~4/3, so images well under the 5MB client check fail or stall the action. Gemini is called with no cache and no auth (cost and latency; auth is also a security issue in §12).

Fix: put `bodySizeLimit` in `next.config.js` or drop the shadow file. Prefer a short-lived upload (Blob/S3) and send a URL, or keep base64 but compress client-side. Cache by hash if the same image is retried. `dynamic(() => import("recharts"))` is separate but the scan path is the long request.

### High

**5. No `loading.js` on account or transaction routes. Dashboard skeleton is easy to miss because the layout bypasses `children`.**

Only `app/(main)/dashboard/layout.js` lines 30–32 have Suspense, and it imports the page module directly. Navigations to `/account/[id]` and `/transaction/create` have no instant fallback. Account’s inner Suspense is after the await (finding 3).

Fix: `loading.js` beside each async page, and render `{children}` inside the dashboard Suspense instead of importing the page.

**6. Transaction create awaits two independent reads in series.**

`app/(main)/transaction/create/page.jsx` lines 8–15: `await getUserAccounts()` then, when `?edit=` is set, `await getTransaction(editId)`. Both also repeat `auth()` + user lookup.

Fix: `Promise.all`, shared cached `getDbUser()`.

**7. Missing composite indexes (full list in §4).**

The hot one is the recurring cron (`lib/inngest/function.js` lines 93–106): filter on `isRecurring`, `status`, `lastProcessed`, `nextRecurringDate` with no matching index. Dashboard and account sorts by `date` cannot use a `(userId, date)` or `(accountId, date)` index because those indexes do not exist. `Budget.userId` is indexed twice (unique + `@@index`).

**8. Monthly report and budget cron are sequential N+1, and Gemini is uncached.**

`generateMonthlyReports` (`function.js` lines 176–209) loads every user and every account, then per user loads every transaction that month into Node (`getMonthlyStats` lines 337–345) and calls Gemini. `checkBudgetAlerts` (lines 236–247) runs one aggregate per budget inside the loop. Fine at demo size; linear in users.

Fix: aggregate in SQL (`_sum` grouped by `type` and `category`). `step.sendEvent` / fan-out per user instead of a single function awaiting Gemini one by one. Do not cache across users; do cache or skip Gemini when the month’s totals are unchanged.

**9. Recharts is in the main client graph of dashboard and account pages.**

`transaction-overview.jsx` and `account-chart.jsx` are `"use client"` and statically import `recharts`. There is no `next/dynamic`. Combined with finding 2, the dashboard RSC payload includes all transactions **and** the chart library has to hydrate.

Fix: `next/dynamic(..., { ssr: false })` for the chart modules. Pass only the aggregated points.

**10. Landing client JS and permanent `will-change`.**

`hero.jsx` is `"use client"` with no interactivity (lines 1–8). `app/page.js` adds more animated sections. `globals.css` lines 352–364 set `will-change` for the lifetime of those nodes. `prefers-reduced-motion` shortens duration but the nodes still exist.

Fix: drop `"use client"` from `hero.jsx`. Remove `will-change` except during the animation. The landing should not call `checkUser` (finding 1).

### Medium

**11. Prisma client is not stored on `globalThis` in production.**

`lib/prisma.js` lines 3–7. Dev HMR is guarded. Production relies on the module staying cached in the isolate. There is no pool size, no `connection_limit` in the URL (URL not stored in repo), and no Prisma Accelerate. `directUrl` only affects migrations. On serverless, a burst of dashboard requests each doing ~8 queries (finding 2) multiplies connections.

Fix: assign `globalThis.prisma` in all environments. Keep the pooled `DATABASE_URL` for the app and `DIRECT_URL` for migrate. Add the composite indexes before raising pool size.

**12. Over-fetch.** No query uses `select`. Account `_count` plus full `transactions` include returns the count and the rows. `getUserAccounts` includes a count the dashboard cards never show (`account-card.jsx` does not read `_count`). `generateMonthlyReports` includes `accounts` and then does not use them in the snippet that builds stats (stats are by `userId` only).

**13. Balance updates read-modify-write.**

`createTransaction` (`actions/transaction.js` lines 74–93) computes `newBalance` in JS and writes it. Concurrent creates lose updates. The recurring job uses `increment`, which is the right shape. `updateTransaction` increments only `data.accountId` (lines 180–188). Changing the account does not reverse the old account’s balance.

**14. `revalidatePath("/account/[id]")` does not match a real path** (`actions/account.js` line 106). After bulk delete, the open account page can keep stale RSC data until a hard reload. Dashboard path is revalidated.

**15. `getUserAccounts` swallows errors and returns `undefined`** (`actions/dashboard.js` lines 49–51), so the dashboard throws later on `accounts.length` instead of failing fast. Extra round trip, then an error render with no `error.js`.

**16. Dual receipt implementation.** The unused `app/api/scan-receipt/route.js` is still a deployed Gemini call if something hits it. Dead code, live cost.

**17. `TooltipProvider` per table row** (`transaction-table.jsx` lines 385–412). One provider around the table is enough.

**18. Server Action auth chatter.** A dashboard view is 1× `currentUser` + 3× `auth()` before counting Prisma. Clerk round-trips dominate small databases. `cache()` around a single `auth()`/`currentUser()` helper removes the duplicates inside one render.

### Low

**19. Google font preconnects with no stylesheet** (`app/layout.js` lines 39–41) while `next/font` already hosts Inter.

**20. Unused client/server files still in the graph if imported later:** `no-pagination-transaction-table.jsx`, `features-section.jsx`, `components/ui/sonner.jsx` (`next-themes`), `LoadingPage`. They are not on the current route graph except `sonner` and `LoadingPage`, which are unimported.

**21. `console.error` / `console.log`** in `lib/checkUser.js` (line 35, `console.log`), actions, and the Inngest file. `next.config.js` `compiler.removeConsole` strips them in production builds only.

**22. Account chart sort** (`account-chart.jsx` lines 62–64) parses `"MMM dd"` with `new Date`, so the series order is wrong once the range crosses a year boundary. That is correctness, and it also wastes the chart render.

**23. Images.** `banner.jpeg` and `logo.png` are unused bytes in `public/`. The one real image correctly uses `next/image`. Active `next.config.js` does not set `remotePatterns`; nothing remote is rendered.

---

## 10. Code quality & structure

**Duplication.** Transaction tables (pagination vs not). Features section vs `app/page.js`. Receipt scan action vs API route. `calculateNextRecurringDate` (action + Inngest). Decimal serializers (`serializeTransaction` vs `serializeDecimal`) — and `actions/account.js` line 146 calls the name from the other file. Keyframes in both `tailwind.config.js` and `globals.css`. Arcjet “collection” comment on a finance limiter.

**Naming.** `recipt-scanner.jsx` (typo). `DashboardOverview` exported from `transaction-overview.jsx`. `getDashboardData` returns transactions, not a dashboard DTO. Package name is `finance-platform`; product name is Ledgerly. `NoPaginationTransactionTable` encodes a negative in the component name.

**Validation.** Zod exists and is used only in the browser (`app/lib/schema.js`, `zodResolver` in `create-account-drawer.jsx` and `transaction-form.jsx`). Server actions trust the payload. `updateBudget`, `createTransaction`, and `scanReceipt` do not parse with Zod. A direct action call skips the form rules (recurring interval, positive budget, category enum).

**Error handling is three different styles.** Throw `new Error(error.message)` (drops the original stack and throws again if `message` is missing). Return `{ success: false }`. Swallow and return `undefined` (`getUserAccounts`, `checkUser`). No `error.js`. `useFetch` toasts `error.message`. Delete success uses `toast.error` (`transaction-table.jsx` lines 181–184).

**Mixed concerns.** Actions own auth, rate limit, persistence, balance math, revalidation, and serialization. There is no `lib/data` or domain module. Client components own filtering and aggregation that belong in the query. `seed.js` is an action. Email sending is an action imported by a background job.

**Authz holes (detail in §12).** `getUserTransactions` spreads `query` after `userId`. `scanReceipt`, `sendEmail`, `POST /api/scan-receipt`, and `GET /api/seed` do not check the user. `create`/`update` spread client objects into Prisma.

**Balance logic bugs.**

- `updateDefaultAccount` references `serializeTransaction` (`actions/account.js` line 146). The function in that file is `serializeDecimal`. The DB update can succeed and the return still throws.
- `updateTransaction` does not move balance off the previous account when `accountId` changes (`actions/transaction.js` lines 180–188).
- `bulkDeleteTransactions` adds Prisma Decimal with `+` (`actions/account.js` lines 71–76).
- Recurring due check ignores a future `nextRecurringDate` when `lastProcessed` is null (§6).
- `createAccount` unset-default + insert is not transactional.

**Dead code.** `getUserTransactions`, `NoPaginationTransactionTable`, `FeaturesSection`, `testimonialsData`, `LoadingPage`, `LoadingSpinner` (only used by unused `LoadingPage`), `components/ui/sonner.jsx`, `PREVIEW_DATA` in the email template, `public/banner.jpeg`, `public/logo.png`, CSS `.glass-effect`, `.parallax`, `.skeleton`. `TransactionStatus` other than default, `receiptUrl`, category subcategories, and “multi-currency” marketing copy have no implementation. README claims category budgets; the schema has one budget per user.

**Next 15 / React 19.** Async `params` / `searchParams` are awaited (`account/[id]/page.jsx` line 9, `create/page.jsx` line 7), which matches Next 15. Gaps: no `loading.js` / `error.js`, dashboard layout does not render `children`, no `cache()` for per-request dedupe, no `Suspense` around the root header, client components that do not need state (`hero.jsx`, and `not-found.jsx` only needs a tiny client button). React is still the November 2024 RC (`package.json`), not a stable 19 release. `eslint-config-next` is `15.0.3` against Next `15.4.10`.

**JS vs TS.** The repo is entirely JS. The bugs TypeScript would have caught immediately are real: `serializeTransaction` is not in scope, `accounts` possibly `undefined` then `.length`, `getUserTransactions` returning Decimals, Inngest `checkBudgetAlerts` missing `id`. Recommendation: migrate, but not as a rewrite. Add `strict` TypeScript starting at `prisma/schema.prisma` (generated client types), then `lib/`, then `actions/`, and type the action return values. Leave shadcn UI in JS until the data layer is typed. `components.json` `"tsx": false` can flip when UI moves. A full-repo conversion in one step is not justified; the boundary that is hurting is untyped server payloads.

**Target structure**

```
app/                          routes, layouts, loading.js, error.js only
  (auth)/ (main)/ api/
components/                   presentation
  ui/
lib/
  auth/get-user.js            cache()'d Clerk → User
  db/                         prisma + queries (accounts, transactions, budgets)
  validation/                 zod schemas used by actions and forms
  email/                      resend + template
  ai/scan-receipt.js          one Gemini path
  inngest/
  arcjet.js
actions/                      thin: auth, validate, call lib, revalidate
emails/
prisma/
```

Delete `app/lib`, `app/debug-auth`, `app/api/seed`, `app/api/scan-receipt` (or lock them down), `actions/seed.js` from the request path (`prisma/seed` script instead), the duplicate table, and `next.config.mjs` after merging the body-size setting into `next.config.js`.

---

## 11. Environment & scripts

### Env var names

Local `.env` (names only; file is gitignored, there is **no** `.env.example` even though README says `cp .env.example .env.local`):

| Group | Names present in `.env` |
| --- | --- |
| Clerk | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` |
| Database | `DATABASE_URL`, `DIRECT_URL` |
| Arcjet | `ARCJET_KEY` |
| Resend | `RESEND_API_KEY` |
| Gemini | `GEMINI_API_KEY` |

Referenced in code or README but **not** in that `.env`:

| Name | Where it is named |
| --- | --- |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | README only. Not read by repo code; Inngest SDK reads them if set |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | README only. Redirects in code are props on `ClerkProvider` (`app/layout.js`) |
| `NODE_ENV` | `lib/prisma.js`, `next.config.js` |
| `ANALYZE` | `next.config.js` (gates a no-op webpack hook) |

`GEMINI_API_KEY` is read in `actions/transaction.js`, `lib/inngest/function.js`, `app/api/scan-receipt/route.js`. `ARCJET_KEY` in `middleware.js` and `lib/arcjet.js`. `RESEND_API_KEY` in `actions/send-email.js`. `DATABASE_URL` / `DIRECT_URL` in `prisma/schema.prisma`.

### Scripts (`package.json`)

| Script | Command |
| --- | --- |
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `email` | `email dev` (React Email) |
| `postinstall` | `prisma generate` |

No `prisma.seed` config and no `db:seed` script. Seeding is `GET /api/seed` while the dev server is running, which calls `actions/seed.js`. README also says `npx prisma migrate dev` then `npm run dev`. There is no test script.

---

## 12. Open questions

Not verified by running the app. These are gaps or risks visible from the source.

1. **`GET /api/seed` is unauthenticated** (`app/api/seed/route.js`) and deletes every transaction for `accountId === "account-id"`. If that id does not exist the call fails; if it ever does, it wipes the account. It should not be a public route.
2. **`scanReceipt` and `POST /api/scan-receipt` have no auth and no rate limit.** They spend `GEMINI_API_KEY`. The action is reachable as a server action without being signed in.
3. **`sendEmail` is a public server action** (`"use server"`, no `auth()`). A caller who can invoke it can send mail through the Resend key, from `onboarding@resend.dev` (Resend’s test sender, which only delivers to the account owner unless a domain is verified — domain verification was not checked).
4. **`getUserTransactions` is an IDOR if invoked.** `where: { userId, ...query }` lets `query.userId` overwrite the authenticated user (`actions/transaction.js` lines 216–220). No UI calls it today. It also returns raw Decimals and a full `account`.
5. **`updateDefaultAccount` calls `serializeTransaction`, which is not in `actions/account.js`.** Likely throws after the default flag is already changed.
6. **`checkBudgetAlerts` has no Inngest `id`.** The other functions do. Whether `inngest@3` rejects it at serve time was not run.
7. **Inngest keys are absent from `.env`.** Cron functions will not run against Inngest cloud until `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` exist. Local `inngest dev` was not confirmed.
8. **Which database host** sits behind `DATABASE_URL` is outside the repo. Pool limits are unknown.
9. **Recurring scheduler logic** looks wrong for new rows (`lastProcessed == null` ⇒ due). Not executed against a database here.
10. **`updateTransaction` account change** does not adjust the old account balance. Not covered by tests (there are no tests).
11. **Dashboard `accounts.length`** when `getUserAccounts` fails and returns `undefined`.
12. **Arcjet `detectBot` mode `LIVE`** on all matched routes, including `/api/inngest`. Only `GO_HTTP` and search engines are allowed. A non-listed Inngest or webhook client would be blocked. Not observed live.
13. **`/debug-auth` is public** and, when a session exists, prints Clerk user id and email, and clears cookies from script. It is a leftover debug route.
14. **Shared Arcjet bucket** of 10 tokens/hour covers both account creation and transaction creation. Receipt scan, edits, and deletes are not limited. README says “10 req/hour per user” without saying those two writes share it.
15. **README vs repo:** `.env.example` is missing; multi-currency, category budgets, and “real-time sync” are not implemented; `eslint-config-next` does not match Next 15.4.10; React is an RC.
16. **`next.config.mjs` is inert.** Anything that assumed a 5MB server-action limit (the receipt scanner’s comment and client check) is operating under Next’s default limit instead. Not confirmed with a real upload.
17. **`Buffer` in `recipt-scanner.jsx`** (client). Whether the Next client bundle polyfills `Buffer` was not run in a browser. If it does not, scan throws before Gemini.
18. **No `error.js`.** Action throws surface as the framework error overlay / generic error, not an in-app recovery UI.
19. **Marketing stats and hero figures are hardcoded** (`data/landing.js`, `hero.jsx`). They are not product metrics.
20. **Double render of the dashboard page** was not measured. The layout ignores `{children}` and imports the page. At minimum the route slot is unused; a runtime double fetch is possible and was not profiled.
