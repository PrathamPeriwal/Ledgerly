import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";
import { testPrisma } from "../tests/helpers/db";

const prisma = testPrisma();

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

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}

async function accountId(email: string, where: { name?: string; isDefault?: boolean }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { accounts: { where, select: { id: true }, take: 1 } },
  });
  const id = user?.accounts[0]?.id;
  expect(id, `${email} ${JSON.stringify(where)}`).toBeTruthy();
  return id as string;
}

function rows(page: Page) {
  return page.locator('[data-testid="tx-row"]:visible');
}

async function fits(page: Page) {
  return page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    return root.scrollWidth <= window.innerWidth;
  });
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("maya default account filters, pages, and opens the user menu", async ({ page }) => {
  test.setTimeout(120000);
  const errors = watch(page);
  await signIn(page, "maya@example.com");
  const id = await accountId("maya@example.com", { isDefault: true });
  await page.goto(`/account/${id}`, { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("kpi")).toHaveCount(4, { timeout: 20000 });
  await expect(page.locator("[data-chart-ready='true']")).toBeVisible({ timeout: 20000 });
  await expect(rows(page)).toHaveCount(15, { timeout: 20000 });
  await expect(page.getByTestId("tx-footer")).toContainText(/SHOWING 1-15 OF [\d,]+/);

  const boxes = rows(page).locator('[role="checkbox"]');
  await boxes.nth(0).click();
  await boxes.nth(1).click();
  await expect(page.getByText("2 SELECTED")).toBeVisible();
  await page.getByRole("button", { name: "CLEAR", exact: true }).click();
  await expect(page.getByText("2 SELECTED")).toHaveCount(0);

  const income = page.getByTestId("kpi").filter({ hasText: "INCOME" });
  const beforeIncome = await income.innerText();
  const first = rows(page).first();
  const beforeRow = (await first.innerText()).replace(/\s+/g, " ").trim();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(page).toHaveURL(/page=2/, { timeout: 15000 });
  await expect
    .poll(async () => (await rows(page).first().innerText()).replace(/\s+/g, " ").trim())
    .not.toBe(beforeRow);

  await page.getByRole("tab", { name: "1M" }).click();
  await expect(page).toHaveURL(/range=1m/, { timeout: 20000 });
  await expect(income).not.toHaveText(beforeIncome, { timeout: 20000 });

  await page.getByLabel("Search transactions").fill("super");
  await expect(page).toHaveURL(/q=super/, { timeout: 20000 });
  await expect
    .poll(async () => {
      const texts = await rows(page).allInnerTexts();
      return texts.length > 0 && texts.every((text) => /super/i.test(text));
    })
    .toBe(true);

  await page.getByRole("tab", { name: "EXPENSE" }).click();
  await expect(page).toHaveURL(/type=expense/, { timeout: 20000 });
  await expect(page.locator('[data-testid="tx-row"][data-type="INCOME"]:visible')).toHaveCount(0);
  await expect(rows(page).first()).toBeVisible();

  await page.getByRole("navigation", { name: "Primary" }).getByRole("button", { name: "Account menu" }).click();
  await expect(page.getByRole("menuitem", { name: "SIGN OUT" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/account/${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("kpi")).toHaveCount(4, { timeout: 20000 });
  expect(await fits(page)).toBe(true);
  assertClean(errors);
});

test("omar business operating page is paginated", async ({ page }) => {
  test.setTimeout(120000);
  page.setDefaultNavigationTimeout(60000);
  const errors = watch(page);
  await signIn(page, "omar@example.com");
  const id = await accountId("omar@example.com", { name: "Business Operating" });
  await page.goto(`/account/${id}?range=all`, { timeout: 60000, waitUntil: "domcontentloaded" });
  await expect(rows(page)).toHaveCount(15, { timeout: 20000 });
  const footer = await page.getByTestId("tx-footer").innerText();
  const total = Number(footer.match(/OF\s+([\d,]+)/)?.[1].replace(/,/g, ""));
  expect(total).toBeGreaterThan(2000);
  const before = (await rows(page).first().innerText()).replace(/\s+/g, " ").trim();
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect(page).toHaveURL(/page=2/, { timeout: 15000 });
  await expect
    .poll(async () => (await rows(page).first().innerText()).replace(/\s+/g, " ").trim(), { timeout: 20000 })
    .not.toBe(before);
  assertClean(errors);
});

test("hana account lists twelve transactions", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page, "hana@example.com");
  const id = await accountId("hana@example.com", { isDefault: true });
  await page.goto(`/account/${id}`, { waitUntil: "domcontentloaded" });
  await expect(rows(page)).toHaveCount(12, { timeout: 20000 });
  await expect(page.getByTestId("tx-footer")).toContainText("SHOWING 1-12 OF 12");
  await expect(page.getByRole("button", { name: "NEXT", exact: true })).toBeDisabled();
  assertClean(errors);
});

test("maya cannot open daniel's account", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  const id = await accountId("daniel@example.com", { isDefault: true });
  await signIn(page, "maya@example.com");
  await page.goto(`/account/${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("This page is not on the ledger.")).toBeVisible();
  assertClean(errors);
});

test("dashboard set default is only on the non-default account", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page, "maya@example.com");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("account-card")).toHaveCount(2, { timeout: 20000 });
  await expect(page.getByRole("button", { name: "SET DEFAULT" })).toHaveCount(1);
  await expect(
    page
      .getByTestId("account-card")
      .filter({ has: page.getByText("DEFAULT", { exact: true }) })
      .getByRole("button", { name: "SET DEFAULT" }),
  ).toHaveCount(0);
  assertClean(errors);
});

test("screenshots of maya account and the create-account drawer", async ({ page }) => {
  test.setTimeout(120000);
  await signIn(page, "maya@example.com");
  const id = await accountId("maya@example.com", { isDefault: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/account/${id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-chart-ready='true']")).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: "test-results/f6-account-1440.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/f6-account-390.png", fullPage: true });
  expect(await fits(page)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Account menu" })).toBeVisible();
  await page.getByRole("button", { name: "NEW ADD ACCOUNT" }).click();
  await expect(page.getByLabel("ACCOUNT NAME")).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: "test-results/f6-drawer-1440.png" });
});
