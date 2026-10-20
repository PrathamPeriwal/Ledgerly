import { expect, test } from "@playwright/test";

test("dev motion playground scrolls without errors", async ({ page }) => {
  test.setTimeout(90000);
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/dev/motion", { waitUntil: "domcontentloaded" });

  await page.evaluate(async () => {
    const step = Math.max(240, Math.round(window.innerHeight * 0.7));
    const max = document.documentElement.scrollHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, max);
  });

  const heading = page.getByRole("heading", { name: "Effects in motion" });
  await heading.scrollIntoViewIfNeeded();
  await expect(heading).toBeVisible();
  await expect(page.locator("[data-sticky-stage] [data-sticky-card]")).toHaveCount(3);

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
  expect(consoleErrors, consoleErrors.join("\n")).toEqual([]);
});
