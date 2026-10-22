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

async function signIn(page: Page, email: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}

test("maya sees the dashboard overview and can hide amounts", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page, "maya@example.com");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  await expect(page.getByTestId("kpi")).toHaveCount(4);
  await expect(page.getByTestId("account-card")).toHaveCount(2);
  await expect(page.getByTestId("budget-panel")).toContainText("₹90,000.00");
  await expect(page.getByTestId("recent-row")).toHaveCount(5);

  const list = page.getByTestId("recent-list");
  const before = (await list.innerText()).replace(/\s+/g, " ").trim();
  await page.getByLabel("Recent account").selectOption({ label: "High-Yield Savings" });
  await expect
    .poll(async () => (await list.innerText()).replace(/\s+/g, " ").trim())
    .not.toBe(before);
  await expect(page.getByTestId("recent-row")).toHaveCount(5);

  await page.getByRole("button", { name: "HIDE" }).click();
  const amount = page.getByText("₹90,000.00", { exact: true }).first();
  await expect(amount).toHaveCSS("opacity", "0");
  await amount.hover();
  await expect(amount).toHaveCSS("opacity", "1");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("kpi")).toHaveCount(4);
  const fits = await page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    return root.scrollWidth <= window.innerWidth;
  });
  expect(fits).toBe(true);

  assertClean(errors);
});

test("hana sees a prompt to set a monthly budget", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page, "hana@example.com");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("SET A MONTHLY BUDGET")).toBeVisible();
  await expect(page.getByTestId("account-card")).toHaveCount(1);
  assertClean(errors);
});

test("omar dashboard renders", async ({ page }) => {
  test.setTimeout(120000);
  page.setDefaultNavigationTimeout(60000);
  const errors = watch(page);
  await signIn(page, "omar@example.com");
  await page.goto("/dashboard", { timeout: 60000, waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("account-card").filter({ hasText: "Business Operating" })).toBeVisible({
    timeout: 60000,
  });
  assertClean(errors);
});
