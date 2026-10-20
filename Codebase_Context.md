# Codebase Context — Ledgerly (AI Finance Platform)

> **Purpose:** SDE interview preparation — fintech domain. This document is a deep technical reference of the codebase architecture, data flows, and engineering decisions.

---

## 1. Tech Stack & Architecture

### Core Stack

| Layer | Technology | Version / Notes |
|---|---|---|
| Framework | Next.js (App Router) | v15.4.10 — full-stack React |
| Runtime | Node.js | Server Actions + Edge middleware |
| Language | JavaScript (ES Modules) | No TypeScript |
| Database | PostgreSQL (via Supabase) | Two connection URLs: pooled + direct |
| ORM | Prisma | v6.0.1 — type-safe query builder |
| Auth | Clerk | v6.6.0 — external auth provider |
| AI | Google Gemini 2.5 Flash | `@google/generative-ai` SDK |
| Async Jobs | Inngest | v3.27.4 — event-driven background functions |
| Email | Resend + React Email | Transactional emails as React components |
| Rate Limiting | Arcjet | Token bucket + bot detection |
| UI | Radix UI + Tailwind CSS | shadcn/ui component pattern |
| Charts | Recharts | v2.14.1 |
| Forms | React Hook Form + Zod | Schema validation |

---

### Client-Server Relationship

This project uses the **Next.js 15 App Router** model, where the boundary between server and client is explicit and colocated in the same repository — there is no separate Node.js backend process.

```
Browser (React Client Components)
        │
        │  RSC (React Server Components) — render on server, stream HTML
        │  Server Actions ("use server") — RPC-style mutations
        │  Route Handlers (/api/*) — traditional HTTP endpoints
        │
        ▼
  Next.js Server (Node.js runtime)
        │
        ├── Prisma ORM ──────────────► PostgreSQL (Supabase)
        ├── Clerk SDK ───────────────► Clerk Auth API
        ├── Inngest Client ──────────► Inngest Platform (event bus)
        ├── Google Generative AI ────► Gemini API
        └── Resend SDK ──────────────► Resend Email API
```

**Key architectural decision:** Data mutations are handled via **Next.js Server Actions** (files marked `"use server"`), not a traditional REST API. The client calls these functions directly as async functions, and Next.js handles serialization over HTTP under the hood. This colocation eliminates the need for a separate Express/Fastify backend for data mutations.

---

### Routing Structure

Next.js App Router uses **filesystem-based routing** with route groups (parentheses notation) for layout isolation without affecting the URL.

```
app/
├── layout.js                     ← Root layout: ClerkProvider, Header, Toaster
├── page.js                       ← Public landing page (/)
├── not-found.jsx                 ← 404 page
│
├── (auth)/                       ← Route group — auth pages share no special layout
│   ├── sign-in/
│   └── sign-up/
│
├── (main)/                       ← Route group — authenticated pages share a layout
│   ├── layout.js                 ← Calls checkUser() for DB sync on every render
│   ├── dashboard/                ← /dashboard
│   ├── account/[id]/             ← /account/:id (dynamic segment)
│   └── transaction/              ← /transaction/create & /transaction/:id/edit
│
└── api/
    ├── inngest/route.js          ← Webhook endpoint for Inngest platform
    └── scan-receipt/route.js     ← REST endpoint for receipt OCR (POST)
```

**Route Protection:** `middleware.js` runs before every request. It chains two middlewares: **Arcjet first** (bot detection + shield), then **Clerk** (session validation). Protected routes are `/dashboard(.*)`, `/account(.*)`, and `/transaction(.*)`.

---

### Modular Backend Design

The backend logic is organized into distinct, purpose-scoped modules:

| Module | Path | Responsibility |
|---|---|---|
| Server Actions | `actions/` | All data mutations — create, update, delete |
| Inngest Functions | `lib/inngest/function.js` | All scheduled/background jobs |
| Prisma Client | `lib/prisma.js` | Singleton DB client (hot-reload safe) |
| Arcjet Client | `lib/arcjet.js` | Rate limiting rules (token bucket) |
| User Bootstrap | `lib/checkUser.js` | Upsert Clerk user into local DB on first login |
| Email | `actions/send-email.js` | Thin wrapper around Resend SDK |
| Email Templates | `emails/template.jsx` | React Email components for HTML emails |

---

## 2. Database Schema

The database is **PostgreSQL**, managed via **Prisma ORM**. The schema is defined in `prisma/schema.prisma`.

Two connection URLs are configured:
- `DATABASE_URL` — pooled connection (used by Prisma in serverless environments via PgBouncer on Supabase)
- `DIRECT_URL` — direct connection (used by `prisma migrate` to bypass the pooler)

---

### Entity-Relationship Overview

```
User (1) ─────────────── (many) Account
 │                                │
 └────────────────────────── (many) Transaction ◄──────┘
 │
 └────────────────────────── (1) Budget
```

---

### Table: `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | `String` (UUID) | `@id @default(uuid())` |
| `clerkUserId` | `String` | `@unique` — FK to Clerk's auth system |
| `email` | `String` | `@unique` |
| `name` | `String?` | Nullable |
| `imageUrl` | `String?` | Nullable — Clerk profile picture URL |
| `createdAt` | `DateTime` | `@default(now())` |
| `updatedAt` | `DateTime` | `@updatedAt` — auto-managed by Prisma |

**Relations:** One-to-many with `accounts`, `transactions`, `budgets`.

**Design note:** `clerkUserId` is the bridge between Clerk's auth identity and the application's internal user record. On first login, `lib/checkUser.js` runs an upsert to synchronize the two systems.

---

### Table: `accounts`

| Column | Type | Constraints |
|---|---|---|
| `id` | `String` (UUID) | `@id @default(uuid())` |
| `name` | `String` | Account label (e.g., "Chase Checking") |
| `type` | `AccountType` enum | `CURRENT` or `SAVINGS` |
| `balance` | `Decimal` | `@default(0)` — Prisma Decimal preserves financial precision |
| `isDefault` | `Boolean` | `@default(false)` — only one per user should be `true` |
| `userId` | `String` | FK → `users.id` with `onDelete: Cascade` |

**Indexes:** `@@index([userId])` — critical for all user-scoped account queries.

**Design note:** `balance` uses Prisma's `Decimal` type (PostgreSQL `DECIMAL`) rather than `Float` to avoid floating-point imprecision in financial calculations. When returned to the client it must be serialized via `.toNumber()` since `Decimal` objects are not JSON-serializable.

**Business rule:** Only one account per user can have `isDefault: true`. The `updateDefaultAccount` action first runs `updateMany` to clear all existing defaults, then sets the new one — a two-step operation (not atomic), which is a potential race condition under high concurrency.

---

### Table: `transactions`

| Column | Type | Notes |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `type` | `TransactionType` enum | `INCOME` or `EXPENSE` |
| `amount` | `Decimal` | Always positive — type determines sign on balance |
| `description` | `String?` | Free-text memo |
| `date` | `DateTime` | User-specified transaction date |
| `category` | `String` | e.g., `"groceries"`, `"housing"` |
| `receiptUrl` | `String?` | Optional URL to uploaded receipt image |
| `isRecurring` | `Boolean` | `@default(false)` |
| `recurringInterval` | `RecurringInterval?` | `DAILY / WEEKLY / MONTHLY / YEARLY` — nullable |
| `nextRecurringDate` | `DateTime?` | Computed next execution date for the scheduler |
| `lastProcessed` | `DateTime?` | Timestamp of last Inngest execution |
| `status` | `TransactionStatus` enum | `PENDING / COMPLETED / FAILED` — `@default(COMPLETED)` |
| `userId` | `String` | FK → `users.id` with `onDelete: Cascade` |
| `accountId` | `String` | FK → `accounts.id` with `onDelete: Cascade` |

**Indexes:**
- `@@index([userId])` — all user-scoped queries
- `@@index([accountId])` — fetching transactions per account

**Cascade deletes:** Deleting a `User` or `Account` removes all related `Transaction` rows at the database level — no application-level cleanup needed.

**Recurring state machine:** The fields `isRecurring`, `recurringInterval`, `nextRecurringDate`, and `lastProcessed` collectively form a scheduler state machine that is polled daily by an Inngest cron job.

---

### Table: `budgets`

| Column | Type | Constraints |
|---|---|---|
| `id` | `String` (UUID) | PK |
| `amount` | `Decimal` | Monthly budget ceiling |
| `lastAlertSent` | `DateTime?` | De-duplication guard for email alerts |
| `userId` | `String` | `@unique` FK → `users.id` — one budget per user |

**Design note:** The `@unique` on `userId` enforces a one-to-one relationship. The `updateBudget` action uses Prisma's `upsert` to create-or-update in a single atomic query. `lastAlertSent` prevents more than one budget-alert email per calendar month per user.

---

### Enums

```prisma
enum TransactionType    { INCOME | EXPENSE }
enum AccountType        { CURRENT | SAVINGS }
enum TransactionStatus  { PENDING | COMPLETED | FAILED }
enum RecurringInterval  { DAILY | WEEKLY | MONTHLY | YEARLY }
```

---

## 3. API Architecture

### Philosophy: Server Actions over REST

The primary data layer uses **Next.js Server Actions** — async functions marked `"use server"` that execute exclusively on the server. Next.js serializes calls to them over HTTP POST automatically. Benefits:
- No API route file needed for most operations
- Co-located business logic
- Automatic CSRF protection
- `revalidatePath()` can be called inside them to purge the Next.js full-route cache

---

### Server Actions Catalog

#### `actions/dashboard.js`

| Function | Purpose | Rate Limited |
|---|---|---|
| `getUserAccounts()` | Fetch all accounts with transaction counts | No |
| `createAccount(data)` | Create account; auto-sets first as default | Arcjet token bucket |
| `getDashboardData()` | Fetch all user transactions (date desc) | No |

**`createAccount` payload:**
```json
{ "name": "string", "type": "CURRENT|SAVINGS", "balance": 1000, "isDefault": true }
```

---

#### `actions/transaction.js`

| Function | Purpose | Rate Limited |
|---|---|---|
| `createTransaction(data)` | Create transaction + atomically update account balance | Arcjet token bucket |
| `getTransaction(id)` | Fetch a single transaction by ID | No |
| `updateTransaction(id, data)` | Update transaction + recalculate net balance delta | No |
| `getUserTransactions(query)` | Fetch all user transactions with optional filter | No |
| `scanReceipt(fileOrPayload)` | Send receipt to Gemini Vision; return structured data | No |

**`createTransaction` payload:**
```json
{
  "type": "EXPENSE",
  "amount": 42.50,
  "description": "Grocery run",
  "date": "2025-12-01T00:00:00.000Z",
  "category": "groceries",
  "accountId": "uuid",
  "isRecurring": false,
  "recurringInterval": null
}
```

---

#### `actions/account.js`

| Function | Purpose |
|---|---|
| `getAccountWithTransactions(accountId)` | Fetch account + all related transactions desc; includes `_count` |
| `bulkDeleteTransactions(transactionIds[])` | Multi-delete with per-account balance reconciliation in `db.$transaction` |
| `updateDefaultAccount(accountId)` | Clear all `isDefault: true`, then set the target account |

---

#### `actions/budget.js`

| Function | Purpose |
|---|---|
| `getCurrentBudget(accountId)` | Returns current budget + current-month expense aggregate |
| `updateBudget(amount)` | Upsert budget for the authenticated user |

---

### REST API Routes

Only two traditional HTTP route handlers exist in this project:

#### `POST /api/scan-receipt`

A direct REST fallback for receipt scanning (mirrors the Server Action logic).

**Request body:**
```json
{ "base64": "<base64-encoded-image-string>", "mimeType": "image/jpeg" }
```

**Response:**
```json
{ "amount": 42.50, "date": "2025-12-01", "description": "...", "merchantName": "...", "category": "..." }
```

**Runtime:** Explicitly set to `nodejs` (not Edge) to support the Google AI SDK's Node.js dependencies.

---

#### `GET|POST|PUT /api/inngest`

The **Inngest webhook endpoint**. Inngest's cloud platform calls this to:
- Discover registered functions (`GET`)
- Deliver events to trigger functions (`POST`)
- Sync function signatures (`PUT`)

All four Inngest functions are registered here.

---

### Authentication Flow

```
1. User signs in via Clerk (hosted UI at /sign-in)
2. Clerk sets a session cookie (JWT)
3. middleware.js runs on every request:
   a. Arcjet inspects for bots / shields the request
   b. Clerk reads the session cookie → extracts userId
   c. If protected route + no userId → redirect to /sign-in
4. Inside any Server Action:
   - const { userId } = await auth();          ← Clerk userId (string)
   - db.user.findUnique({ where: { clerkUserId: userId } })  ← map to internal UUID
5. All DB queries are scoped to user.id (internal UUID)
```

**Identity bridge pattern:** Clerk manages authentication; the app maintains its own `users` table linked via `clerkUserId`. The `lib/checkUser.js` module, called in `app/(main)/layout.js`, performs an upsert on every authenticated page load — ensuring the internal user record always exists before any action is attempted.

---

### Rate Limiting (Arcjet)

Two Arcjet instances are configured:

**`lib/arcjet.js` (Action-level):** Token bucket — 10 tokens/user/hour, capacity 10. Applied to `createAccount` and `createTransaction` to prevent flooding.

**`middleware.js` (Request-level):** Shield mode (LIVE) blocks known attack patterns (SQLi, XSS). Bot detection (LIVE) blocks automated crawlers but explicitly allows `CATEGORY:SEARCH_ENGINE` and `GO_HTTP` (required for Inngest's HTTP callbacks to pass through the bot filter).

---

## 4. Asynchronous Workflows

All background/scheduled work is handled by **Inngest** — a durable, event-driven workflow platform. The Inngest client (`lib/inngest/client.js`) is configured with exponential backoff retry (`delay = 2^attempt * 1000ms`, max 2 attempts).

All functions are served from the single webhook: `GET|POST|PUT /api/inngest`.

---

### Function 1: `triggerRecurringTransactions` (Cron Dispatcher)

**Trigger:** Cron `0 0 * * *` — daily at midnight UTC.

**What it does:**
1. `step.run("fetch-recurring-transactions")` — Queries all transactions where `isRecurring = true` AND `status = COMPLETED` AND (`lastProcessed IS NULL` OR `nextRecurringDate <= NOW()`).
2. Maps each due transaction to an Inngest event: `{ name: "transaction.recurring.process", data: { transactionId, userId } }`.
3. Calls `inngest.send(events)` — **batch-fires** all events simultaneously.

**Design note:** This cron is intentionally a **pure fan-out dispatcher**. It discovers due transactions and fires events; it does not process them. This decouples discovery from execution and enables per-user throttling on the consumer function.

---

### Function 2: `processRecurringTransaction` (Event Consumer)

**Trigger:** Event `"transaction.recurring.process"`.

**Throttle:** 10 executions per user per minute (`key: "event.data.userId"`). Prevents a user with many recurring transactions from flooding the database.

**What it does (inside `step.run`):**
1. Fetch the transaction by `id + userId` (ownership check), including the related `account`.
2. Call `isTransactionDue(transaction)` — a **double-check** guard. Returns `true` if `lastProcessed` is null OR `nextRecurringDate <= today`. Guards against race conditions if the function retries.
3. Execute `db.$transaction(async tx => { ... })` — atomic block with three operations:
   - `tx.transaction.create(...)` — new transaction row (copy of template, `isRecurring: false`, dated today)
   - `tx.account.update(...)` — increment/decrement balance
   - `tx.transaction.update(...)` — update `lastProcessed = now()`, `nextRecurringDate = calculateNextRecurringDate(...)`
4. If any step throws, all three DB operations roll back via PostgreSQL transaction semantics.

---

### Function 3: `generateMonthlyReports` (Cron + AI)

**Trigger:** Cron `0 0 1 * *` — first day of each month at midnight UTC.

**What it does:**
1. `step.run("fetch-users")` — loads all users with their accounts.
2. For each user, a separate `step.run("generate-report-{userId}")`:
   - `getMonthlyStats(userId, lastMonth)` — reduces all transactions in the date range into `{ totalIncome, totalExpenses, byCategory, transactionCount }`.
   - `generateFinancialInsights(stats, monthName)` — calls Gemini 2.5 Flash with a structured prompt; returns 3 AI-generated insight strings.
   - `sendEmail(...)` — sends the monthly report via Resend.

**Why per-user `step.run`?** Inngest's `step.run` creates a **durable checkpoint**. If the function crashes mid-iteration, Inngest replays from the last completed step — not from the beginning — preventing duplicate emails to already-processed users.

---

### Function 4: `checkBudgetAlerts` (Cron)

**Trigger:** Cron `0 */6 * * *` — every 6 hours.

**What it does:**
1. Fetches all budgets with a deep join: `budget → user → accounts (where isDefault = true)`.
2. For each budget, inside `step.run`:
   - Aggregates `EXPENSE` transactions on the **default account only** since the 1st of the current month (`db.transaction.aggregate({ _sum: { amount: true } })`).
   - Computes `percentageUsed = (totalExpenses / budgetAmount) * 100`.
   - If `percentageUsed >= 80` AND (`lastAlertSent IS NULL` OR `isNewMonth(lastAlertSent, now)`) → send budget-alert email and update `budget.lastAlertSent = now()`.

**De-duplication guard:** `isNewMonth()` checks both `.getMonth()` and `.getFullYear()` to correctly handle year boundaries — ensuring at most one alert per user per calendar month.

---

### Email Automation Trigger Chain

```
Inngest Cron
    │
    ├─ generateMonthlyReports
    │       → getMonthlyStats()
    │       → generateFinancialInsights(Gemini 2.5 Flash)
    │       → sendEmail({ type: "monthly-report" })
    │
    └─ checkBudgetAlerts
            → db.transaction.aggregate()
            → sendEmail({ type: "budget-alert" })

sendEmail()
    → Resend SDK
    → React Email component rendered to HTML
    → Delivered to user inbox
```

`EmailTemplate` (`emails/template.jsx`) is a single React component branching on `type: "monthly-report" | "budget-alert"`. It is rendered server-side to HTML by the `react-email` library and passed to Resend's SDK as the `react` property.

---

## 5. Gemini AI Integration

### Receipt Scanning Data Flow

```
Step 1: User selects image file in browser
        (TransactionForm client component)

Step 2: Browser reads file via FileReader API
        → Converts to Base64 string
        → Extracts MIME type (e.g., "image/jpeg")

Step 3: Client invokes Server Action: scanReceipt({ base64, mimeType })
        OR sends POST /api/scan-receipt with { base64, mimeType }

Step 4: Server (actions/transaction.js → scanReceipt())
        → Instantiates GoogleGenerativeAI with GEMINI_API_KEY
        → Selects model: "gemini-2.5-flash"

Step 5: Constructs multimodal request array:
        model.generateContent([
          promptString,                                    ← Part 1: text
          { inlineData: { data: base64String, mimeType } } ← Part 2: image bytes
        ])

Step 6: Gemini Vision API analyzes the image

Step 7: Raw text response is sanitized:
        text.replace(/```(?:json)?\n?/g, "").replace(/```\n?/g, "").trim()
        → JSON.parse(cleanedText)

Step 8: Structured object returned to client:
        { amount, date, description, category, merchantName }

Step 9: Client auto-populates the transaction form fields
```

---

### Prompt Engineering — Receipt Extraction

The prompt is a **strict structured extraction prompt**:

```
Analyze this receipt image and extract the following information in JSON format:
- Total amount (just the number)
- Date (in ISO format)
- Description or items purchased (brief summary)
- Merchant/store name
- Suggested category (one of: housing, transportation, groceries, utilities,
  entertainment, food, shopping, healthcare, education, personal, travel,
  insurance, gifts, bills, other-expense)

IMPORTANT: Respond ONLY with valid JSON, no markdown, no extra text.
Format:
{
  "amount": number,
  "date": "ISO date string",
  "description": "string",
  "merchantName": "string",
  "category": "string"
}

If it's not a receipt, return an empty object {}.
```

**Key prompt engineering decisions:**
1. **Closed vocabulary for category** — 15 fixed values constrain the model's output to values the application already understands. Prevents free-form strings that would break filtering/grouping logic.
2. **"just the number" for amount** — Removes currency symbol handling from the model's concern. Response is cast to `Number(data.amount)` server-side.
3. **ISO format for date** — Ensures `new Date(data.date)` works reliably without locale ambiguity.
4. **"ONLY valid JSON, no markdown"** — Direct mitigation for Gemini's tendency to wrap output in markdown code fences. A secondary sanitization regex is still applied as a safety net.
5. **Empty object fallback** — If the image is not a receipt, the model returns `{}`. The server detects `Object.keys(data).length === 0` and throws a user-facing error.

---

### Prompt Engineering — Monthly Financial Insights

Used inside `generateFinancialInsights()` in the Inngest monthly report function:

```
Analyze this financial data and provide 3 concise, actionable insights.
Focus on spending patterns and practical advice.
Keep it friendly and conversational.

Financial Data for {month}:
- Total Income: ${totalIncome}
- Total Expenses: ${totalExpenses}
- Net Income: ${totalIncome - totalExpenses}
- Expense Categories: housing: $1500, groceries: $600, ...

Format the response as a JSON array of strings, like this:
["insight 1", "insight 2", "insight 3"]
```

**Design decisions:**
1. **Inline financial data** — Stats are injected directly via template literals, converting database records into natural language context the model can reason over.
2. **JSON array output** — Each element is rendered as a bullet point in the React Email template.
3. **Tone instruction** — "friendly and conversational" controls register for a user-facing email vs. a clinical report.
4. **Hardcoded fallback array** — If Gemini fails or returns unparseable JSON, 3 generic static strings are returned, ensuring the email still sends without crashing the entire monthly report job.

---

## 6. Complex Logic Flow

### Complex Function #1: `createTransaction` — Atomic Balance Update

**File:** `actions/transaction.js` (lines 23–105)

This is the most financially critical function in the codebase. A bug here could corrupt account balances. It is protected by three layered guards.

**Step-by-step flow:**

```
1. AUTH CHECK
   const { userId } = await auth()
   → Throws "Unauthorized" if no valid Clerk session

2. RATE LIMIT CHECK (Arcjet token bucket)
   aj.protect(req, { userId, requested: 1 })
   → 10 tokens/hour per userId
   → decision.isDenied() → throws "Too many requests"

3. USER RESOLUTION
   db.user.findUnique({ where: { clerkUserId: userId } })
   → Bridges Clerk string identity to internal UUID

4. ACCOUNT OWNERSHIP CHECK
   db.account.findUnique({ where: { id: data.accountId, userId: user.id } })
   → Compound WHERE clause: accountId AND userId
   → Prevents IDOR: User A cannot create transactions on User B's account

5. BALANCE PRE-COMPUTATION
   const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount
   const newBalance = account.balance.toNumber() + balanceChange
   → .toNumber() converts Prisma Decimal to JS number for arithmetic

6. ATOMIC DB TRANSACTION
   await db.$transaction(async (tx) => {
     // Operation A: Create transaction record
     tx.transaction.create({ data: {
       ...data,
       userId: user.id,
       nextRecurringDate: isRecurring ? calculateNextRecurringDate(...) : null
     }})

     // Operation B: Update account balance (absolute value, not increment)
     tx.account.update({
       where: { id: data.accountId },
       data: { balance: newBalance }
     })

     return newTransaction
   })
   → If either A or B throws, PostgreSQL rolls back both writes

7. CACHE INVALIDATION
   revalidatePath("/dashboard")
   revalidatePath(`/account/${transaction.accountId}`)
   → Tells Next.js to re-render these routes on next request
   → Ensures the UI reflects the new balance without a full page reload

8. RETURN SERIALIZED RESULT
   serializeAmount(transaction)  →  { ...transaction, amount: amount.toNumber() }
   → Prisma Decimal objects cannot cross the server/client boundary as JSON
```

**Why `db.$transaction`?** Without it, if `transaction.create` succeeds but `account.update` fails (e.g., DB timeout), the transaction row would exist but the balance would be wrong — a financial inconsistency. Prisma interactive transactions ensure **atomicity**: either both writes commit or neither does.

**Why absolute balance vs `{ increment }`?** The balance is pre-fetched and computed in application code before any write. This makes the logic auditable and the final value verifiable, and allows the ownership check to happen on the same fetch.

---

### Complex Function #2: `scanReceipt` — Multimodal AI Receipt Parsing

**File:** `actions/transaction.js` (lines 236–321)

This function bridges file upload → multimodal AI → structured domain data. Its complexity lies in handling multiple input formats and producing robust, type-safe output.

**Step-by-step flow:**

```
1. API KEY GUARD
   if (!process.env.GEMINI_API_KEY) → throw
   → Fails fast with a clear message instead of a cryptic SDK error downstream

2. MODEL INITIALIZATION
   getGemini() → new GoogleGenerativeAI(GEMINI_API_KEY)
   model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

3. INPUT NORMALIZATION (handles 3 input shapes)

   Shape A: { base64: string, mimeType: string }   ← Most common (client sends pre-encoded)
     base64String = fileOrPayload.base64
     mimeType     = fileOrPayload.mimeType

   Shape B: File/Blob object with .arrayBuffer()   ← Legacy/server-side usage
     arrayBuffer = await fileOrPayload.arrayBuffer()
     base64String = Buffer.from(arrayBuffer).toString("base64")
     mimeType     = fileOrPayload.type

   Shape C: Raw base64 string
     base64String = fileOrPayload

   → All three paths converge to: { base64String, mimeType }

4. MULTIMODAL REQUEST CONSTRUCTION
   model.generateContent([
     promptString,                                    ← Part 1: text instruction
     { inlineData: { data: base64String, mimeType } } ← Part 2: image bytes (inline)
   ])
   → Image is sent as base64 inline, not as a URL reference
   → No intermediate storage upload required before AI analysis

5. RESPONSE EXTRACTION
   const text = response.text()
   → Raw text from Gemini (may contain markdown fences)

6. SANITIZATION (two-pass regex)
   text.replace(/```(?:json)?\n?/g, "")   ← strip opening ```json or ```
       .replace(/```\n?/g, "")             ← strip closing ```
       .trim()

7. JSON PARSING WITH EMPTY-OBJECT GUARD
   const data = JSON.parse(cleanedText || "{}")
   if (!data || Object.keys(data).length === 0)
     → throw "No receipt details detected"
   → Guards against valid JSON that is an empty object (non-receipt image)

8. TYPE COERCION AND SAFE DEFAULTS
   return {
     amount:       Number(data.amount) || 0,
     date:         data.date ? new Date(data.date) : new Date(),
     description:  data.description || "",
     category:     data.category || "other-expense",
     merchantName: data.merchantName || "",
   }
   → Each field has a safe fallback so partial AI responses don't crash the caller

9. UNIFIED ERROR BOUNDARY
   Outer try/catch → throw new Error(error.message || "Failed to scan receipt")
   → Normalizes network errors, parse errors, and validation errors
     into a single Error the client can display as a toast notification
```

**Why base64 inline and not a URL?** The receipt image exists only in browser memory at upload time — it has not been persisted to storage yet. Sending it as inline base64 directly to the Gemini API avoids an intermediate storage-upload step before AI analysis, reducing latency and infrastructure surface area.

**Why the multi-format input handling?** The function originally accepted a server-side `File` object but evolved to accept the `{ base64, mimeType }` payload pattern as the client interaction model changed. The three branches maintain backward compatibility across different call sites without requiring a breaking API change.

---

*Document generated: September 2026 — covers the full Ledgerly codebase at HEAD.*
