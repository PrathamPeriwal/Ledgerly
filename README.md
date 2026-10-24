[![CI](https://github.com/PrathamPeriwal/Ledgerly/actions/workflows/ci.yml/badge.svg)](https://github.com/PrathamPeriwal/Ledgerly/actions/workflows/ci.yml)

# Ledgerly

Ledgerly is a personal finance app that turns receipts into reviewed transactions and shows how much of your monthly budget is left.

**Live demo:** https://ledgerly-finance-one.vercel.app
Choose **Try the demo** to explore a pre-filled ledger. No sign-up needed.

## Highlights

- **Receipt scanning with review.** Upload a receipt, Gemini extracts the fields, and you confirm or edit them before anything is saved.
- **Budget pace.** One monthly budget per account, with a clear view of spend against the days remaining.
- **Multiple accounts** and manual entry for cash or anything a receipt can't cover.
- **Recurring transactions** created automatically by background jobs.
- **Monthly email reports** delivered through Resend.
- **Fast server-side search, filters, and pagination** (15 per page, executed in the database query).
- **Privacy mode** to mask balances, and a **command menu** for keyboard navigation.

## Architecture

| Concern | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| Styling and motion | Tailwind CSS 3.4, Motion |
| Data | PostgreSQL with Prisma 6 |
| Authentication | Clerk |
| Abuse protection | Arcjet rate limiting and bot detection |
| Background jobs | Inngest (schedule below) |
| AI | Google Gemini via `@google/genai` (receipt extraction, monthly insights) |
| Email | Resend |
| Testing | Vitest (unit), Playwright (e2e) |

### Layers

`actions/` (thin server actions) call `lib/services/` (writes and rules), which use Prisma inside one transaction. Server components read through `lib/data/`, where totals are grouped SQL queries. Zod schemas are in `lib/validation/`. Details and design decisions: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Request flow

1. Clerk authenticates users. The demo button requests a short-lived ticket from `/api/demo-session` and signs into a sample ledger.
2. A receipt image is posted to `/api/scan-receipt`; Gemini returns structured fields that pre-fill the transaction form.
3. Mutations run as action, service, one database transaction (row plus balance change), then revalidation.
4. Dashboard and account pages render on the server, with search and filters applied in the query.

### Background jobs (Inngest, UTC)

| Job | Schedule |
| --- | --- |
| Recurring transactions | daily at 00:00 |
| Budget alerts | every 6 hours |
| Monthly reports | 1st of the month at 00:00 |
| Demo reset | daily at 20:00 (01:30 IST), restores the demo ledger |

Each cron job fans out one event per item, so one failure does not block the others.

### Scan rate limits

Receipt scans are limited per hour by Arcjet: 10 per user, 15 per IP, and 6 shared across all demo sessions. Uploads are JPEG, PNG or WebP up to 5 MB. Over the limit returns HTTP 429.

## Getting started

Requirements: Node.js 20+ and a PostgreSQL database.

```bash
git clone https://github.com/PrathamPeriwal/Ledgerly.git
cd Ledgerly
npm install
cp .env.example .env     # then fill in the values
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. Every variable is described in [docs/ENV.md](docs/ENV.md).

## Demo data

Five personas and 992 transactions from 2026-04-01: Maya 280, Daniel 200, Priya 200, Lucas 300, Hana 12. Seeded addresses are `maya@example.com`, `daniel@example.com`, `priya@example.com`, `lucas@example.com`, and `hana@example.com`. Hana has no budget. Daniel's current month is about 90% of budget and Priya's is over 100%.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Lint, typecheck, and production build |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript check only |
| `npm run test:e2e:quick` | Playwright smoke test of the demo user's dashboard and account page (needs Clerk test keys and the seeded demo users) |
| `npm run verify` | Lint, unit tests, build, and smoke script |
| `npm run seed:demo` | Dry run by default. With `--confirm` it **wipes** transactions, budgets, accounts, and users in the target database, then deletes only the retired Clerk user `omar@example.com` |

## Project structure

```
app/          routes, layouts, and route handlers
components/   shared UI
actions/      server actions
lib/          queries, Prisma client, email, Inngest
prisma/       schema and migrations
emails/       monthly report template
e2e/          Playwright tests
tests/        Vitest tests
docs/         environment and engineering notes
```

## Deployment

Designed for Vercel. Set the variables listed in [docs/ENV.md](docs/ENV.md) (mark secrets as **Sensitive**), run `npx prisma migrate deploy` against the production database, and register `/api/inngest` with Inngest.

## License

[MIT](LICENSE)
