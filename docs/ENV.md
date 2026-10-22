# Environment variables

Names only. Put values in `.env` locally and in Vercel. Never commit them.

`VERCEL_PROJECT_PRODUCTION_URL` is set by Vercel. Everything else in the table is read with `process.env`, except `DATABASE_URL` (Prisma `env()`), `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (Clerk SDK), and the two Inngest keys (Inngest SDK).

| Name | Service | Required in Vercel Production | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Prisma / Postgres | yes | Pooled connection for app queries |
| `DIRECT_URL` | Prisma / Postgres | yes | Direct connection for migrations |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | yes | Browser auth |
| `CLERK_SECRET_KEY` | Clerk | yes | Server auth and the demo sign-in ticket |
| `ARCJET_KEY` | Arcjet | yes | Bot and abuse rules in middleware |
| `ARCJET_ENV` | Arcjet | no | `development` forces dry-run for local tests |
| `GEMINI_API_KEY` | Google Gemini | yes | Receipt scan and monthly insights |
| `RESEND_API_KEY` | Resend | yes | Sends the monthly report |
| `INNGEST_EVENT_KEY` | Inngest | yes | Sends recurring and email events |
| `INNGEST_SIGNING_KEY` | Inngest | yes | Verifies Inngest requests to `/api/inngest` |
| `DEMO_USER_EMAIL` | Demo | no | Demo user. Defaults to `maya@example.com` |
| `DEMO_USER_PASSWORD` | Demo seed / Playwright | no | Password for `npm run seed:demo` and one e2e test |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel | no | Host for absolute Open Graph and sitemap URLs. Vercel sets it |
| `NODE_ENV` | Node | no | Set by Next.js and Vercel |
| `ANALYZE` | Bundle analyzer | no | `true` enables the analyzer during build |
| `BASE_URL` | Playwright | no | Target origin. Defaults to `http://localhost:3000` |
| `RUN_PERF` | Playwright | no | Set to run `e2e/perf` |
| `npm_lifecycle_event` | npm | no | Set by npm. `test:e2e:quick` reads it to run two Maya tests |
