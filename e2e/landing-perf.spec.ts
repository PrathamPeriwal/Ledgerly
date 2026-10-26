import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("signed-out landing makes no Clerk requests and renders the hero in raw HTML", async ({ page, request }) => {
  // Dev Clerk instances bounce the very first document request through /v1/client/handshake
  // (clerkMiddleware, unchanged); that is a navigation, not clerk-js. Everything else must be absent.
  const clerkHits: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (/clerk/i.test(new URL(url).host) && !url.includes("/v1/client/handshake")) clerkHits.push(url);
  });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.locator("h1")).toContainText("KNOW WHERE IT WENT");
  await page.waitForTimeout(2500);
  expect(clerkHits, clerkHits.join("\n")).toEqual([]);

  const html = await (await request.get("/")).text();
  expect(html).toContain("KNOW WHERE IT WENT");
  expect(html).toContain("Ledgerly reads your receipts");
});

test("maya sees a DASHBOARD cell on the landing page", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: "maya@example.com" });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const cell = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dashboard" });
  await expect(cell).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Login" })).toHaveCount(0);
  await cell.click();
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 30000 });
});

test("sign-in still renders the Clerk widget", async ({ page }) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.locator("input").first()).toBeVisible({ timeout: 20000 });
});

test("demo lands on the dashboard with the banner and signs out to the landing page", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/demo", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 45000 });
  await expect(page.getByText("SAMPLE DATA. THIS IS A DEMO ACCOUNT.")).toBeVisible();
  await page.getByRole("link", { name: "SIGN OUT" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
});
