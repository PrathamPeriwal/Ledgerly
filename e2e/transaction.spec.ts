import { PrismaClient } from "@prisma/client";
import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

const prisma = new PrismaClient();
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function watch(page: Page) {
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500 && !response.url().includes("/api/scan-receipt")) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  return { pageErrors, httpErrors };
}

function assertClean(errors: { pageErrors: string[]; httpErrors: string[] }) {
  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
}

async function signIn(page: Page) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: "hana@example.com" });
}

async function cleanup() {
  const rows = await prisma.transaction.findMany({
    where: { description: "E2E test", user: { email: "hana@example.com" } },
  });
  for (const row of rows) {
    const restore = row.type === "EXPENSE" ? row.amount : row.amount.negated();
    await prisma.$transaction([
      prisma.transaction.delete({ where: { id: row.id } }),
      prisma.account.update({ where: { id: row.accountId }, data: { balance: { increment: restore } } }),
    ]);
  }
}

function upload(page: Page, name: string) {
  return page.locator('input[type="file"]').setInputFiles({ name, mimeType: "image/png", buffer: PNG });
}

test.afterEach(async () => {
  await cleanup();
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("hana can review a scan and save a transaction by hand", async ({ page }) => {
  test.setTimeout(180000);
  const errors = watch(page);
  await signIn(page);
  const hana = await prisma.user.findUnique({
    where: { email: "hana@example.com" },
    select: { accounts: { where: { isDefault: true }, select: { id: true, name: true }, take: 1 } },
  });
  const accountId = hana?.accounts[0]?.id;
  expect(accountId).toBeTruthy();
  const maya = await prisma.account.findFirst({
    where: { user: { email: "maya@example.com" }, isDefault: true },
    select: { id: true, name: true },
  });
  expect(maya?.id).toBeTruthy();

  await page.goto(`/account/${accountId}`, { waitUntil: "domcontentloaded" });
  const balance = page.getByTestId("kpi").filter({ hasText: "BALANCE" });
  await expect(balance).toBeVisible({ timeout: 20000 });
  const original = (await balance.innerText()).replace(/\s+/g, " ");
  const before = await prisma.transaction.count({ where: { user: { email: "hana@example.com" } } });

  await page.goto(`/transaction/create?account=${accountId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("combobox", { name: "ACCOUNT" })).toContainText("Main Account", { timeout: 20000 });

  await page.goto(`/transaction/create?account=${maya?.id}`, { waitUntil: "domcontentloaded" });
  const accountSelect = page.getByRole("combobox", { name: "ACCOUNT" });
  await expect(accountSelect).toContainText("Main Account", { timeout: 20000 });
  await expect(accountSelect).not.toContainText(maya?.name ?? "High-Yield");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transaction/create", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "ADD TRANSACTION" })).toBeVisible({ timeout: 20000 });
  const fits = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    return root.scrollWidth <= window.innerWidth;
  });
  expect(fits).toBe(true);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("form[data-ready='true']")).toBeVisible();

  const today = new Date().toISOString().slice(0, 10);
  await page.route("**/api/scan-receipt", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        amount: 42.18,
        date: today,
        description: "Corner Market",
        merchantName: "Corner Market",
        category: "groceries",
      }),
    }),
  );
  await upload(page, "receipt.png");
  await expect(page.getByText("AI FILLED")).toHaveCount(5, { timeout: 15000 });
  await expect(page).toHaveURL(/\/transaction\/create/);
  await expect(page.getByLabel("AMOUNT")).toHaveValue("42.18");
  expect(await prisma.transaction.count({ where: { user: { email: "hana@example.com" } } })).toBe(before);

  await page.getByLabel("AMOUNT").fill("7");
  await expect(page.getByText("AI FILLED")).toHaveCount(4);

  await page.getByRole("button", { name: "DISCARD SCAN" }).click();
  await expect(page.getByText("AI FILLED")).toHaveCount(0);
  await expect(page.getByLabel("AMOUNT")).toHaveValue("");
  await expect(page.getByLabel("DESCRIPTION")).toHaveValue("");

  await page.unroute("**/api/scan-receipt");
  await page.route("**/api/scan-receipt", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "nope" }) }),
  );
  await upload(page, "receipt-bad.png");
  await expect(page.getByRole("main").getByText("COULDN'T READ THAT RECEIPT. ENTER IT BY HAND.")).toBeVisible({
    timeout: 15000,
  });

  await page.getByRole("button", { name: "EXPENSE", exact: true }).click();
  await page.getByLabel("AMOUNT").fill("12.34");
  await page.getByLabel("DESCRIPTION").fill("E2E test");
  await page.getByRole("combobox", { name: "CATEGORY" }).click();
  await page.getByRole("option", { name: "Groceries", exact: true }).click();
  await page.getByRole("button", { name: "SAVE TRANSACTION" }).click();

  await expect(page).toHaveURL(new RegExp(`/account/${accountId}`), { timeout: 20000 });
  const first = page.locator('[data-testid="tx-row"]:visible').first();
  await expect(first).toContainText("E2E test", { timeout: 20000 });
  await expect(first).toContainText("$12.34");

  await first.getByRole("button", { name: "Row actions" }).click();
  await page.getByRole("menuitem", { name: "DELETE" }).click();
  await page.getByRole("button", { name: "DELETE", exact: true }).click();
  await expect(page.getByText("E2E test")).toHaveCount(0, { timeout: 20000 });
  await expect(balance).toContainText(original.match(/-?\$[\d,]+\.\d{2}/)?.[0] ?? original, { timeout: 20000 });
  assertClean(errors);
});

test("hana category list scrolls without shifting the page", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/transaction/create", { waitUntil: "domcontentloaded" });
  await expect(page.locator("form[data-ready='true']")).toBeVisible({ timeout: 20000 });
  const before = await page.evaluate(() => document.documentElement.clientWidth);
  await page.getByRole("combobox", { name: "CATEGORY" }).click();
  const list = page.getByRole("listbox");
  await expect(list).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(before);
  await list.press("End");
  const last = list.getByRole("option").last();
  await expect(last).toBeVisible();
  const box = await last.boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && box.y >= 0 && box.y + box.height <= viewport.height + 1).toBe(true);
  const name = (await last.innerText()).trim();
  await last.click();
  await expect(page.getByRole("combobox", { name: "CATEGORY" })).toContainText(name);

  const account = await prisma.user.findUnique({
    where: { email: "hana@example.com" },
    select: { accounts: { where: { isDefault: true }, select: { id: true }, take: 1 } },
  });
  await page.goto(`/account/${account?.accounts[0]?.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="tx-row"]:visible').first()).toBeVisible({ timeout: 20000 });
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  await page.getByRole("button", { name: "Row actions" }).first().click();
  await expect(page.getByRole("menuitem", { name: "EDIT" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(width);
  assertClean(errors);
});
