import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const personas = [
  {
    email: "maya@example.com",
    accounts: ["Everyday Checking", "High-Yield Savings"],
  },
  {
    email: "daniel@example.com",
    accounts: ["Business Checking", "Personal Checking", "Tax Savings"],
  },
  {
    email: "priya@example.com",
    accounts: ["Student Checking"],
  },
  {
    email: "lucas@example.com",
    accounts: ["Joint Checking", "Emergency Fund", "Kids & School"],
  },
  {
    email: "hana@example.com",
    accounts: ["Main Account"],
    fresh: true,
  },
];

function watch(page) {
  const pageErrors = [];
  const httpErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  return { pageErrors, httpErrors };
}

async function signIn(page, email) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
}

test.describe("demo dashboards", () => {
  for (const persona of personas) {
    test(`${persona.email} can open the dashboard`, async ({ page }) => {
      test.setTimeout(persona.slow ? 120000 : 90000);
      page.setDefaultNavigationTimeout(persona.slow ? 60000 : 45000);
      const errors = watch(page);
      await signIn(page, persona.email);
      await page.goto("/dashboard", {
        timeout: persona.slow ? 60000 : 45000,
        waitUntil: "domcontentloaded",
      });

      for (const name of persona.accounts) {
        await expect(page.getByText(name).first()).toBeVisible({
          timeout: persona.slow ? 60000 : 15000,
        });
      }

      if (persona.fresh) {
        await expect(page.getByText("SET A MONTHLY BUDGET")).toBeVisible();
        await expect(page.getByText("% used")).toHaveCount(0);
        const href = await page.getByRole("link", { name: /Main Account/ }).getAttribute("href");
        await page.goto(href);
        await expect(page.getByRole("heading", { name: "Main Account" })).toBeVisible();
        await expect(page.getByText("SHOWING 1-12 OF 12")).toBeVisible();
      }

      expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
      expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
    });
  }
});

test("maya default account lists transactions and a balance", async ({ page }) => {
  test.setTimeout(90000);
  const errors = watch(page);
  await signIn(page, "maya@example.com");
  await page.goto("/dashboard");
  const href = await page.getByRole("link", { name: /Everyday Checking/ }).getAttribute("href");
  await page.goto(href);
  await expect(page).toHaveURL(/\/account\//);
  await expect(page.getByRole("heading", { name: "Everyday Checking" })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText(/₹[\d,]+\.\d{2}/).first()).toBeVisible();
  await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 20000 });
  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
});

test("maya can move the default badge and the data is restored", async ({ page }) => {
  const errors = watch(page);
  await signIn(page, "maya@example.com");

  async function openDashboard() {
    await page.goto("/dashboard");
    await expect(page.getByText("Everyday Checking").first()).toBeVisible();
  }

  async function switchDefault(accountName) {
    await page
      .getByTestId("account-card")
      .filter({ hasText: accountName })
      .getByRole("button", { name: "SET DEFAULT" })
      .click();
    await expect(page.getByText("Failed to update default account")).toHaveCount(0);
    await expect(page.getByText("Default account updated successfully")).toBeVisible({
      timeout: 20000,
    });
  }

  try {
    await openDashboard();
    await switchDefault("High-Yield Savings");
    await openDashboard();
    await expect(
      page.getByRole("link", { name: /High-Yield Savings/ }).getByText("DEFAULT", { exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Everyday Checking/ }).getByText("DEFAULT", { exact: true })
    ).toHaveCount(0);
  } finally {
    await openDashboard();
    const savingsIsDefault = await page
      .getByRole("link", { name: /High-Yield Savings/ })
      .getByText("DEFAULT", { exact: true })
      .count();
    if (savingsIsDefault > 0) {
      await switchDefault("Everyday Checking");
      await openDashboard();
      await expect(
        page.getByRole("link", { name: /Everyday Checking/ }).getByText("DEFAULT", { exact: true })
      ).toBeVisible();
    }
  }

  expect(errors.pageErrors, errors.pageErrors.join("\n")).toEqual([]);
  expect(errors.httpErrors, errors.httpErrors.join("\n")).toEqual([]);
});

test("maya can sign in with the demo password", async ({ page }) => {
  const password = process.env.DEMO_USER_PASSWORD;
  expect(password, "DEMO_USER_PASSWORD is missing").toBeTruthy();

  await page.goto("/");
  try {
    await clerk.signIn({
      page,
      signInParams: {
        strategy: "password",
        identifier: "maya@example.com",
        password,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isPasswordSignInDisabled(message)) {
      test.info().annotations.push({
        type: "needs-human",
        description: passwordDisabledSteps(message),
      });
      test.skip(true, "password sign-in is disabled in the Clerk instance");
    }
    throw error;
  }

  await page.goto("/dashboard");
  await expect(page.getByText("Everyday Checking").first()).toBeVisible();
});

function isPasswordSignInDisabled(message) {
  return /password/i.test(message) && /disabled|not enabled|not allowed|strategy.*invalid|unsupported/i.test(message);
}

function passwordDisabledSteps(message) {
  return [
    "Password sign-in is disabled in this Clerk instance, so the demo password could not be checked.",
    `Clerk said: ${message}`,
    "Enable it in the Clerk Dashboard: Configure → Email, phone, username → Password → turn Password on.",
  ].join(" ");
}
