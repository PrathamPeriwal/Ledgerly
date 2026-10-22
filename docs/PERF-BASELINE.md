# Performance baseline

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
