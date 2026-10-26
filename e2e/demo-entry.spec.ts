import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

function watch(page: Page) {
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) httpErrors.push(`${response.status()} ${response.url()}`);
  });
  return { pageErrors, httpErrors };
}

function assertClean(errors: { pageErrors: string[]; httpErrors: string[] }) {
  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
}

async function fits(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

test.describe.configure({ mode: "serial" });

test("signed-out sign-in shows the Clerk form and the demo cell", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/home.png", fullPage: true });

  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await expect(page.locator("input").first()).toBeVisible({ timeout: 20000 });
  const demo = page.getByRole("link", { name: "TRY THE DEMO" });
  await expect(demo).toBeVisible();
  await expect(demo).toHaveAttribute("href", "/demo");
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/sign-in.png", fullPage: true });

  await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
  await expect(page.locator("input").first()).toBeVisible({ timeout: 20000 });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/sign-up.png", fullPage: true });
  assertClean(errors);
});

test("one-click demo signs in as Maya and signs out from the banner", async ({ page }) => {
  test.setTimeout(120000);
  const errors = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 45000 });
  await expect(page.getByText("SAMPLE DATA. THIS IS A DEMO ACCOUNT.")).toBeVisible();
  await expect(page.getByTestId("account-card")).toHaveCount(2, { timeout: 20000 });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/dashboard.png", fullPage: true });

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("button", { name: "Account menu" })).toContainText("MC");
  await page.screenshot({ path: "tmp/f8/menu.png" });
  await page.keyboard.press("Escape");

  await page.getByRole("link", { name: /Everyday Checking/ }).click();
  await page.waitForURL(/\/account\//, { timeout: 20000 });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/account.png", fullPage: true });

  await page.goto("/transaction/create", { waitUntil: "domcontentloaded" });
  expect(await fits(page)).toBe(true);
  await page.screenshot({ path: "tmp/f8/create.png", fullPage: true });

  await page.getByRole("link", { name: "SIGN OUT" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 20000 });
  assertClean(errors);
});

test("demo entry switches a signed-in Hana session to Maya", async ({ page }) => {
  test.setTimeout(120000);
  const errors = watch(page);
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: "hana@example.com" });
  await page.goto("/demo", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 45000 });
  await expect(page.getByRole("button", { name: "Account menu" })).toContainText("MC", { timeout: 20000 });
  await expect(page.getByText("SAMPLE DATA. THIS IS A DEMO ACCOUNT.")).toBeVisible();
  assertClean(errors);
});
