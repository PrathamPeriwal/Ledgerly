import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

test.use({ userAgent: BROWSER_UA });

function origin() {
  return process.env.BASE_URL || "http://localhost:3000";
}

function watch(page: Page) {
  const pageErrors: string[] = [];
  const httpErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    const status = response.status();
    if (status < 400) return;
    let same = false;
    try {
      same = new URL(response.url()).origin === new URL(origin()).origin;
    } catch {
      same = false;
    }
    if (same) httpErrors.push(`${status} ${response.url()}`);
  });
  return { pageErrors, httpErrors };
}

test("public routes, robots, sitemap, and open graph", async ({ playwright }) => {
  const request: APIRequestContext = await playwright.request.newContext({
    baseURL: origin(),
    extraHTTPHeaders: { "user-agent": BROWSER_UA },
  });
  try {
    const home = await request.get("/");
    expect(home.status()).toBe(200);
    expect(await home.text()).toContain("KNOW WHERE IT WENT");

    expect((await request.get("/sign-in")).status()).toBe(200);
    expect((await request.get("/api/seed")).status()).toBe(404);
    expect((await request.get("/debug-auth")).status()).toBe(404);

    const scan = await request.post("/api/scan-receipt");
    expect(scan.status()).toBe(401);

    expect((await request.get("/robots.txt")).status()).toBe(200);
    expect((await request.get("/sitemap.xml")).status()).toBe(200);

    const og = await request.get("/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"] ?? "").toMatch(/^image\//);
  } finally {
    await request.dispose();
  }
});

test("signed-out dashboard ends on sign-in", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/, { timeout: 20000 });
  expect(page.url().length).toBeLessThan(2000);
  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
});

test("demo opens Maya with two accounts and 15 rows", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30000 });
  await expect(page.getByText("SAMPLE DATA. THIS IS A DEMO ACCOUNT.")).toBeVisible();
  await expect(page.getByTestId("account-card")).toHaveCount(2, { timeout: 20000 });
  const href = await page.getByRole("link", { name: /Everyday Checking/ }).getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!);
  await expect(page.getByRole("heading", { name: "Everyday Checking" })).toBeVisible({ timeout: 20000 });
  await expect(page.locator("tbody tr")).toHaveCount(15);
  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
});
