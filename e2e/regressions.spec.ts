import { clerk } from "@clerk/testing/playwright";
import { expect, test, type Page } from "@playwright/test";

async function armProgress(page: Page) {
  await page.evaluate(() => {
    const mark = () => {
      if (document.querySelector("[data-testid='route-progress']")) {
        (window as unknown as { __sawProgress?: boolean }).__sawProgress = true;
      }
    };
    (window as unknown as { __sawProgress?: boolean }).__sawProgress = false;
    new MutationObserver(mark).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
    });
    mark();
  });
}

test("a keydown event without a key does not crash", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    document.dispatchEvent(new Event("keydown"));
    window.dispatchEvent(new Event("keydown"));
  });
  expect(errors, errors.join("\n")).toEqual([]);
});

test("sign out then back stays off the authenticated app", async ({ page }) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  const chain: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) chain.push(`${response.status()} ${response.url()}`);
  });
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: "maya@example.com" });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "SIGN OUT" }).click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30000 });

  const navigations: { url: string; cookie: number; status: number }[] = [];
  page.on("request", (request) => {
    if (!request.isNavigationRequest()) return;
    navigations.push({
      url: request.url(),
      cookie: (request.headers().cookie || "").length,
      status: 0,
    });
  });
  page.on("response", (response) => {
    const hit = [...navigations].reverse().find((item) => item.url === response.url() && item.status === 0);
    if (hit) hit.status = response.status();
  });

  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForURL((url) => url.pathname === "/" || url.pathname.startsWith("/sign-in"), { timeout: 20000 });
  const finalUrl = page.url();
  const path = new URL(finalUrl).pathname;
  console.log(JSON.stringify({ chain, navigations, finalUrl, cookie: navigations.map((item) => item.cookie) }));
  expect(finalUrl.length, finalUrl).toBeLessThan(2000);
  expect(path === "/" || path.startsWith("/sign-in"), finalUrl).toBe(true);
  expect(navigations.some((item) => item.status === 431 || item.status >= 500), JSON.stringify(navigations)).toBe(false);
  expect(errors, errors.join("\n")).toEqual([]);
});

test("nav and pagination show the progress bar", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: "maya@example.com" });
  await page.goto("/transaction/create", { waitUntil: "domcontentloaded" });
  await armProgress(page);
  await page.getByRole("link", { name: "Accounts" }).first().click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sawProgress?: boolean }).__sawProgress)).toBe(true);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const href = await page.getByRole("link", { name: /Everyday Checking/ }).getAttribute("href");
  await page.goto(href || "/dashboard", { waitUntil: "domcontentloaded" });
  await armProgress(page);
  await page.getByRole("button", { name: "NEXT", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sawProgress?: boolean }).__sawProgress)).toBe(true);
});
