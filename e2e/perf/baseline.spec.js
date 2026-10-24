import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const users = [
  { key: "Lucas", email: "lucas@example.com" },
  { key: "Maya", email: "maya@example.com" },
];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summarize(samples) {
  const keys = ["ttfb", "domContentLoaded", "load", "lcp", "jsBytes", "requests"];
  const summary = {};
  for (const key of keys) summary[key] = median(samples.map((sample) => sample[key]));
  return summary;
}

test("production baseline", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  page.setDefaultNavigationTimeout(90000);

  const client = await page.context().newCDPSession(page);
  await client.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__lcp = last.startTime;
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });

  const measured = [];

  for (const user of users) {
    await page.context().clearCookies();
    await page.goto("/");
    await clerk.signIn({ page, emailAddress: user.email });
    await page.goto("/dashboard");
    await expect(page.getByText(/Checking|Operating|Account/).first()).toBeVisible({
      timeout: 90000,
    });

    const accountHref = await page
      .locator("a", { hasText: "Default" })
      .first()
      .getAttribute("href");
    expect(accountHref, `${user.email} default account link`).toBeTruthy();

    const routes = ["/", "/dashboard", accountHref];
    for (const route of routes) {
      const samples = [];
      for (let run = 0; run < 3; run += 1) {
        await page.goto(route, { waitUntil: "load" });
        await page.waitForTimeout(500);
        const sample = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          const resources = performance.getEntriesByType("resource");
          const jsBytes = resources
            .filter(
              (entry) =>
                entry.initiatorType === "script" || /\.js(\?|$)/.test(entry.name)
            )
            .reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
          return {
            ttfb: nav.responseStart - nav.requestStart,
            domContentLoaded: nav.domContentLoadedEventEnd,
            load: nav.loadEventEnd,
            lcp: window.__lcp || 0,
            jsBytes,
            requests: resources.length + 1,
          };
        });
        samples.push(sample);
      }
      measured.push({ user: user.key, route, ...summarize(samples) });
    }
  }

  const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const date = new Date().toISOString().slice(0, 10);
  const prodUrl = process.env.BASE_URL;
  const lines = [
    "# Performance baseline",
    "",
    `Measured on ${date} from this machine against the production site, which still runs the old code.`,
    "",
    `- Date: ${date}`,
    `- Commit: \`${commit}\``,
    `- PROD_URL: ${prodUrl}`,
    "- The commit above is the local revamp checkout at measurement time. Production was not deployed from it.",
    "- Each number is the median of 3 runs in desktop Chromium, signed in through the Clerk test helper.",
    "- TTFB is `responseStart - requestStart`. DOMContentLoaded and load are the navigation timestamps in milliseconds. LCP comes from a PerformanceObserver. JS bytes are transferred script bytes. The request count includes the document.",
    "",
    "| User | Route | TTFB (ms) | DOMContentLoaded (ms) | Load (ms) | LCP (ms) | JS bytes | Requests |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...measured.map(
      (row) =>
        `| ${row.user} | ${row.route} | ${Math.round(row.ttfb)} | ${Math.round(row.domContentLoaded)} | ${Math.round(row.load)} | ${Math.round(row.lcp)} | ${Math.round(row.jsBytes)} | ${Math.round(row.requests)} |`
    ),
    "",
  ];

  const file = path.join(process.cwd(), "docs", "PERF-BASELINE.md");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, lines.join("\n"));
  console.log(lines.join("\n"));
});
