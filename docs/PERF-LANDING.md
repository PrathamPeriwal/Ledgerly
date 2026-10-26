# Landing page performance (signed-out "/")

All numbers are **local lab numbers** (Lighthouse mobile defaults, throttled, local production build on :3200, median of 3, dev Clerk instance). They are not production measurements. Reproduce with `node scripts/perf-landing.mjs`.

## Diagnosis
- **LCP element:** the hero `h1` ("KNOW WHERE IT WENT."). It is in the server HTML, so it was not hidden by JS. It was delayed by the document TTFB (incl. the dev-instance Clerk handshake redirect), render-blocking CSS, the font swap and a long main thread (TBT 511 ms) from hydrating Clerk + the full motion bundle.
- **Clerk on "/":** yes. `ClerkProvider` sat in the root layout, so clerk-js (clerk.browser, ui-common, vendors, framework, ~280 KB transfer from the Clerk host) plus `/v1/environment` and `/v1/client` loaded on every page. `SiteNav` (`SignedIn`/`SignedOut`, `UserMenu`) and `ReloadOnRestore` (`useAuth`) were the landing-page importers.
- **Heaviest first-load chunks (before):** Clerk ui-common 119 KB, clerk.browser 89 KB, react-dom chunk `4bd1b696` 54 KB, `7639` 48 KB (shared app chunk pulled in by the root layout: Clerk client + full `motion`), Clerk vendors 47 KB. After: `4bd1b696` 54, `1255` 46 (React/Next runtime), then chunks of 12 KB or less.
- **Hero animation:** the heading bar used `useInView` + controls (starts only after hydration); the text itself was already visible.

## Before
```
Lab run (local, mobile defaults), base http://localhost:3200, median of 3
performance score: 63
FCP: 2772 ms
LCP: 4929 ms
TBT: 511 ms
CLS: 0.000
JS transfer: 603 KB
requests: 43
LCP element: div.px-4 > div.relative > div.relative > h1.relative
LCP phase TTFB: 1165 ms
LCP phase Load Delay: 0 ms
LCP phase Load Time: 0 ms
LCP phase Render Delay: 3765 ms
LCP phase Time to first byte: 1165 ms
LCP phase Element render delay: 448 ms
Clerk requests (run 3): 10
  https://famous-muskrat-92.clerk.accounts.dev/v1/client/handshake
  http://localhost:3200/
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/clerk.browser.js
  https://famous-muskrat-92.clerk.accounts.dev/v1/environment
  https://famous-muskrat-92.clerk.accounts.dev/v1/client
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/framework_clerk.browser_70f75e_5.128.0.js
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/vendors_clerk.browser_70f75e_5.128.0.js
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/ui-common_clerk.browser_70f75e_5.128.0.js
  https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/subscriptionDetails_clerk.browser_70f75e_5.128.0.js
Font requests: 3
  /_next/static/media/313510e2713fb214-s.p.woff2
  /_next/static/media/7d4881bb7e1bf84d-s.p.woff2
  /_next/static/media/2b5b02fc7e511755-s.woff2
Heaviest JS (median run):
  119 KB https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/ui-common_clerk.browser_70f75e_5.128.0.js
  89 KB https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/clerk.browser.js
  54 KB /_next/static/chunks/4bd1b696-100b9d70ed4e49c1.js
  48 KB /_next/static/chunks/7639-45367b803a786643.js
  47 KB https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/vendors_clerk.browser_70f75e_5.128.0.js
Unused JS (median run, KB total / wasted):
  118 / 85 https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/ui-common_clerk.browser_70f75e_5.128.0.js
  79 / 54 https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5/dist/clerk.browser.js
  47 / 44 https://famous-muskrat-92.clerk.accounts.dev/npm/@clerk/clerk-js@5.128.0/dist/vendors_clerk.browser_70f75e_5.128.0.js
  47 / 26 /_next/static/chunks/7639-45367b803a786643.js

```

## After (one pass: Clerk moved out of the root layout, CSS hero bar, LazyMotion + `m`, lazy How-it-works stack, deferred cursor/grid, `prefetch={false}`)
```
Lab run (local, mobile defaults), base http://localhost:3200, median of 3
performance score: 77
FCP: 3295 ms
LCP: 4494 ms
TBT: 123 ms
CLS: 0.000
JS transfer: 190 KB
requests: 34
LCP element: div.px-4 > div.relative > div.relative > h1.relative
LCP phase TTFB: 517 ms
LCP phase Load Delay: 0 ms
LCP phase Load Time: 0 ms
LCP phase Render Delay: 3964 ms
LCP phase Time to first byte: 517 ms
LCP phase Element render delay: 198 ms
Clerk requests (run 3): 2
  https://famous-muskrat-92.clerk.accounts.dev/v1/client/handshake
  http://localhost:3200/
Font requests: 3
  /_next/static/media/313510e2713fb214-s.p.woff2
  /_next/static/media/7d4881bb7e1bf84d-s.p.woff2
  /_next/static/media/2b5b02fc7e511755-s.woff2
Heaviest JS (median run):
  54 KB /_next/static/chunks/4bd1b696-100b9d70ed4e49c1.js
  46 KB /_next/static/chunks/1255-0f63bc33b24afcdd.js
  12 KB /_next/static/chunks/8795-28906db5ca94d739.js
  10 KB /_next/static/chunks/2295-b2860536e12c9f62.js
  8 KB /_next/static/chunks/9503-0267d10bac9ea545.js
Unused JS (median run, KB total / wasted):

```

## Change (medians, lab)
| Metric | Before | After | Change |
|---|---|---|---|
| Performance score | 63 | 77 | +22% |
| FCP | 2772 ms | 3295 ms | +19% (noise: TTFB dominated by dev handshake, 1165 vs 517 ms in the TTFB phase) |
| LCP | 4929 ms | 4494 ms | -9% |
| TBT | 511 ms | 123 ms | -76% |
| JS transfer | 603 KB | 190 KB | -68% |
| Requests | 43 | 34 | -21% |
| Clerk requests | 10 | 2 (dev-only `/v1/client/handshake` redirect from unchanged middleware) | -80% |

FCP/LCP stay high in the lab because Lighthouse's mobile throttling plus the dev-instance handshake dominate; they were not tuned further (one pass only).

## Before B7
Local production build on :3200 (`ARCJET_ENV=development`), Lighthouse mobile defaults, median of 3, dev Clerk instance.

| Metric | Before B7 |
| --- | --- |
| Performance / SEO / Accessibility / Best practices | 72 / 100 / 100 / 100 |
| FCP / LCP / TBT | 3208 ms / 5038 ms / 191 ms |
| JS transfer / requests | 190 KB / 34 |
| Failing SEO and accessibility audits | none |
| "/" HTML | 139.8 KB |

- **Cookieless Googlebot fetch of "/" (redirect manual):** status 200, no Location, chunked body, `Cache-Control: s-maxage=31536000`. Clerk skips the handshake for bots, so the bot was fine. A cookieless Chrome (Lighthouse) was not: it was sent to `/v1/client/handshake` on the Clerk host (2 Clerk requests, about 900 ms TTFB).
- **Scroll jank** (`node scripts/scroll-jank.mjs`, 6 s scripted scroll, CPU 4x, median of 3):

| Viewport | Median frame | Frames over 16.7 ms | Frames over 50 ms | Long tasks | Clusters (scroll %) |
| --- | --- | --- | --- | --- | --- |
| Desktop 1440x900 | 16.7 ms | 14.7% | 0.0% | 4, 239 ms | 0-10%, 30-40%, 10-20% |
| Mobile 390x844 | 16.7 ms | 0.0% | 0.0% | 0, 0 ms | none |

"Over 16.7 ms" uses a 0.5 ms timer tolerance (rAF at 60 Hz jitters around 16.7).

## After B7
Same setup.

| Metric | After B7 |
| --- | --- |
| Performance / SEO / Accessibility / Best practices | 86 / 100 / 100 / 100 |
| FCP / LCP / TBT | 1526 ms / 3564 ms / 217 ms |
| JS transfer / requests | 229 KB / 35 |
| Clerk requests on "/" | 0 |
| "/" HTML | 158.1 KB (FAQ, JSON-LD and the second nav are new text) |

- **Middleware** no longer runs on "/", "/privacy", robots, sitemap, manifest, generated images, icons and static files. The cookieless Googlebot fetch still returns 200 with no Location. A cookieless browser no longer gets a handshake redirect.
- **JS transfer** is higher than before (190 to 229 KB) because the Clerk handshake no longer interrupts the load, so more chunks finish inside the measured window. The route's First Load JS is unchanged (166 KB).
- **`experimental.inlineCss: true`** was tried and reverted: FCP 1217 ms and performance 86, but "/" HTML grew to 293.8 KB (limit 150 KB), and LCP did not improve (3590 ms).
- **Hydration check:** nothing on the landing page that carries text uses `ssr: false`. The only `ssr: false` is the mobile menu, which mounts after a click. The raw HTML contains "Scan a receipt or type it in", "Nothing is saved until you confirm", UNDER THE HOOD and the FAQ (checked by `npm run check:seo`).
- **Scroll jank:**

| Viewport | Median frame | Frames over 16.7 ms | Frames over 50 ms | Long tasks | Clusters (scroll %) |
| --- | --- | --- | --- | --- | --- |
| Desktop 1440x900 | 16.7 ms | 19.1% | 1.7% | 7, 541 ms | 0-10%, 30-40%, 10-20% |
| Mobile 390x844 | 16.7 ms | 0.0% | 0.0% | 0, 0 ms | none |

The desktop figures vary a lot between runs at 4x CPU throttling (long tasks 4 to 7). Most of the long-task time sits in the first 10% of the scroll, which is when hydration and the deferred effects finish.

## COST OF EFFECTS
Report only. No effect was removed or simplified in B7.

| Effect | Evidence | Recommendation |
| --- | --- | --- |
| Grid drift (`BgGridDrift`) | Loaded after idle (`DeferredFx`), so it adds no first-load JS. Part of the long tasks in the first 10% of the scroll. | Keep. |
| Diagonal grid and sticky stack (`StickyCardStack`) | 30-40% of the scroll (the how-it-works section) has the second cluster: 255 to 441 ms of long tasks, no frame over 50 ms. The stack is the largest part of the landing route chunk (4.95 kB route, 166 kB First Load JS shared with the whole site). | Keep. Watch it if cards are added. |
| Custom cursor | Deferred chunk. Mobile has no cursor and no long tasks. Desktop only. | Keep. |
| Hero scan demo | Hydrates in the first 10% of the scroll, where the largest long-task total sits (388 to 1016 ms across runs). | Keep. If jank matters, mount it on view. |
| Marquee | No cluster at its scroll position. CSS driven. | Keep. |
| Reveal animations (`RevealHeading`, `WipeReveal`) | No cluster at section headings. They use `useInView` and transform only. | Keep. |

Mobile at 4x CPU shows no frame over 50 ms and no long task, so no effect needs to be simplified on this data.