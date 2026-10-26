# Performance baseline

## Before

Measured on 21 Oct 2026, 02:21 IST (20 Oct 2026, 20:51 UTC) from this machine against the production site, which still runs the old code on the shared database.

- Date: 2026-10-21 (02:21 IST)
- Commit: `800c4309614dfcec6d2f6a7cc7fb70ca1bf12ccf`
- PROD_URL: https://ledgerly-finance-one.vercel.app
- The commit above is the local revamp checkout at measurement time. Production was not deployed from it.
- Each number is the median of 3 runs in desktop Chromium, signed in through the Clerk test helper.
- TTFB is `responseStart - requestStart`. DOMContentLoaded and load are the navigation timestamps in milliseconds. LCP comes from a PerformanceObserver. JS bytes are transferred script bytes. The request count includes the document.

| User | Route | TTFB (ms) | DOMContentLoaded (ms) | Load (ms) | LCP (ms) | JS bytes | Requests |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Omar | / | 45 | 1981 | 2133 | 2228 | 407755 | 24 |
| Omar | /dashboard | 44 | 8249 | 8253 | 1836 | 588957 | 34 |
| Omar | /account/3c03ecc9-c835-4e96-81a3-dede50f5beea | 43 | 5322 | 5323 | 5608 | 562677 | 29 |
| Maya | / | 43 | 1808 | 1949 | 2040 | 407755 | 24 |
| Maya | /dashboard | 43 | 6849 | 6850 | 1708 | 588957 | 34 |
| Maya | /account/5cde5450-416e-4786-a01f-ce587acda435 | 43 | 4185 | 4512 | 4472 | 562677 | 28 |

Demo data was rescaled by 25 for rupees after the baseline; transaction counts are unchanged.

## After (release v1.1.0, 24 Oct 2026)

Measured on 24 Oct 2026, 23:59 IST from this machine against production at `v1.1.0` (`b3a695bec5b36beb850af3a58e6ff72c94c37bc8`). Same users (Omar, Maya), same routes (`/`, `/dashboard`, and each default account page), median of 3 runs, same metrics. Change is `(after − before) / before`; a negative change is faster or fewer requests. The default account ids differ from the Before table because the demo ledger was reset; transaction counts are unchanged. The rupee rescale does not change these counts. Numbers are from this machine.

| User | Route | TTFB (ms) | DOMContentLoaded (ms) | Load (ms) | LCP (ms) | JS bytes | Requests | Load change | LCP change | Requests change |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Omar | / | 214 | 563 | 3261 | 676 | 312008 | 32 | +53% | −70% | +33% |
| Omar | /dashboard | 297 | 1301 | 4340 | 1440 | 478864 | 43 | −47% | −22% | +26% |
| Omar | /account/1b93b28b-1813-4f09-af77-d4a1937ccd94 | 152 | 445 | 2078 | 548 | 462242 | 44 | −61% | −90% | +52% |
| Maya | / | 97 | 2140 | 4531 | 2436 | 312008 | 32 | +132% | +19% | +33% |
| Maya | /dashboard | 149 | 1219 | 6977 | 1256 | 362382 | 37 | +2% | −26% | +9% |
| Maya | /account/3e1180b5-7ce6-4bec-b0c0-4921a01f4f53 | 59 | 728 | 842 | 764 | 462242 | 43 | −81% | −83% | +54% |

Omar's 3,000-transaction account was retired from the demo set after these measurements. The numbers above are historical.

## Final (v1.4.0, 27 Oct 2026)

Measured on 27 Oct 2026 from this machine against production (https://ledgerly-finance-one.vercel.app) with `e2e/perf/baseline.spec.js`: Maya only, routes `/`, `/dashboard`, and her default account page, median of 3 runs, same metrics as the Before table. Change is `(after − before) / before` against Maya's Before rows only. A negative change is faster or fewer requests.

Maya's data changed from 300 to 280 transactions and from dollars to rupees after the baseline. The earlier "After v1.1.0" run and the later diagnostics used different methods, so only this table is the like-for-like comparison.

| User | Route | TTFB (ms) | DOMContentLoaded (ms) | Load (ms) | LCP (ms) | JS bytes | Requests | Load change | LCP change | Requests change |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Maya | / | 43 | 220 | 314 | 300 | 233746 | 32 | −84% | −85% | +33% |
| Maya | /dashboard | 43 | 446 | 669 | 460 | 671541 | 57 | −90% | −73% | +68% |
| Maya | /account/4134e8ce-4dc7-4229-8414-cc00a5a3c8cd | 43 | 311 | 581 | 336 | 655104 | 58 | −87% | −92% | +107% |
