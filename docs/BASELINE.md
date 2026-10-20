# Pre-revamp baseline

- Date: 2026-10-20
- Branch: `revamp`
- Commit measured: `ea1a0719f48d12e7d92f7c66e9144d4c405327fc`
- `main` at measurement: `4e4ab00b59a2328dcb152907d5cb6ca1ab604e7b` (unchanged)
- Next.js reported by the build: 15.4.6

## Lint

- Command: `npm run lint`
- Result: pass (exit 0)
- ESLint warnings: 1
- ESLint errors: 0

Warning:

- `app/(main)/transaction/_components/recipt-scanner.jsx:51:6` — `react-hooks/exhaustive-deps` (`onScanComplete`, `setScannedData`)

## Build

- Command: `npm run build`
- Result: pass (exit 0)
- The same ESLint warning was printed again during "Linting and checking validity of types".
- Additional compiler warnings: 2
  - webpack cache: serializing a large string (166kiB)
  - `@arcjet/runtime` uses `process.release`, which is not supported in the Edge Runtime

### Route table

| Route | Size | First Load JS |
| --- | ---: | ---: |
| `/` | 4.43 kB | 115 kB |
| `/_not-found` | 138 B | 100 kB |
| `/account/[id]` | 25.5 kB | 269 kB |
| `/api/inngest` | 138 B | 100 kB |
| `/api/scan-receipt` | 138 B | 100 kB |
| `/api/seed` | 138 B | 100 kB |
| `/dashboard` | 144 B | 296 kB |
| `/debug-auth` | 1.67 kB | 136 kB |
| `/sign-in/[[...sign-in]]` | 482 B | 134 kB |
| `/sign-up/[[...sign-up]]` | 482 B | 134 kB |
| `/transaction/create` | 22.9 kB | 208 kB |

Shared First Load JS: 100 kB (`4bd1b696-9911af18dede28aa.js` 54.1 kB, `964-d440e6eafae0ffc3.js` 43.7 kB, other shared chunks 2.09 kB).

Middleware: 117 kB.

All listed routes are dynamic (server-rendered on demand).
