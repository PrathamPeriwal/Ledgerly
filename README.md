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
| Background jobs | Inngest (recurring transactions, monthly reports) |
| AI | Google Gemini for receipt extraction |
| Email | Resend |
| Testing | Vitest, Playwright |

### Request flow

1. Clerk authenticates users. The demo button requests a short-lived ticket from `/api/demo-session` and signs into a sample ledger.
2. A receipt image is posted to `/api/scan-receipt`; Gemini returns structured fields that pre-fill the transaction form.
3. Accounts, transactions, and budgets are stored in Postgres via Prisma.
4. Inngest functions create due recurring transactions and send the monthly report.
5. Dashboard and account pages render on the server, with search and filters applied in the query.

## Getting started

Requirements: Node.js 18+ and a PostgreSQL database.

```bash
git clone https://github.com/PrathamPeriwal/Ledgerly.git
cd Ledgerly
npm install
cp .env.example .env     # then fill in the values
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000. Every variable is described in [docs/ENV.md](docs/ENV.md).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run check` | Lint, typecheck, and production build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e:quick` | Playwright smoke test of the demo user's dashboard and account page |
| `npm run verify` | Lint, unit tests, build, and smoke script |
| `npm run seed:demo` | Dry run by default. With `--confirm` it **wipes** transactions, budgets, accounts, and users in the target database; it does not delete Clerk users |

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
