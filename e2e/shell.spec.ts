import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

function watch(page: Page) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return pageErrors;
}

test("signed-out landing renders the nav without uncaught errors", async ({ page }) => {
  const pageErrors = watch(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Ledgerly" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Features" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "How it works" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the demo" }).first()).toBeVisible();
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("unknown routes show the 404 page", async ({ page }) => {
  await page.goto("/does-not-exist", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back home" })).toBeVisible();
});

test("maya opens the command menu and jumps to the dashboard", async ({ page }) => {
  test.setTimeout(90000);
  const pageErrors = watch(page);
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: "maya@example.com" });
  await page.goto("/transaction/create", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.commandMenu === "ready");
  // Chromium reserves Ctrl+K, so the test fires the same keydown the page listens for.
  await page.evaluate(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }),
    );
  });
  const dialog = page.getByRole("dialog", { name: "Command menu" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByPlaceholder("Type a command");
  await input.pressSequentially("dash");
  await expect(dialog.getByRole("option", { name: "Dashboard" })).toBeVisible();
  await input.press("Enter");
  await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20000 });
  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
