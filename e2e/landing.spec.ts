import { expect, test } from "@playwright/test";

test("signed-out landing: scan demo flow and mobile layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("KNOW WHERE IT WENT");
  await expect(page.locator("#features")).toBeAttached();
  await expect(page.locator("#how")).toBeAttached();

  const balance = page.getByTestId("balance");
  await expect(balance).toHaveText("$4,820.00", { timeout: 10000 });
  const rows = page.getByTestId("ledger-row");
  const before = await rows.count();

  await page.getByRole("button", { name: "SCAN SAMPLE RECEIPT" }).click();
  const confirm = page.getByRole("button", { name: "CONFIRM", exact: true });
  await expect(confirm).toBeVisible({ timeout: 15000 });
  await confirm.click();

  await expect(rows).toHaveCount(before + 1);
  await expect(rows.first()).toContainText("Corner Market");
  await expect(balance).not.toHaveText("$4,820.00");
  await expect(balance).toHaveText("$4,777.82", { timeout: 5000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(overflow).toBe(true);

  expect(errors, errors.join("\n")).toEqual([]);
});
