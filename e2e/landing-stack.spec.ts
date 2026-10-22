import { expect, test, type Page } from "@playwright/test";

type Box = { x: number; y: number; width: number; height: number };

async function pinAt(page: Page, p: number) {
  await page.evaluate((progress) => {
    const section = document.querySelector("[data-sticky-section]") as HTMLElement;
    const stage = document.querySelector("[data-sticky-stage]") as HTMLElement;
    const nav = parseFloat(getComputedStyle(stage).top) || 0;
    const top = section.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - nav + progress * (section.offsetHeight - stage.offsetHeight));
  }, p);
  await page.waitForTimeout(1500);
}

async function state(page: Page) {
  return page.evaluate(() => {
    const stage = (document.querySelector("[data-sticky-stage]") as HTMLElement).getBoundingClientRect();
    const cards = [...document.querySelectorAll("[data-sticky-stage] [data-sticky-card]")].map((el) => {
      const r = el.getBoundingClientRect();
      const visible = r.right > stage.left && r.left < stage.right && r.bottom > stage.top && r.top < stage.bottom;
      return { visible, box: { x: r.x, y: r.y, width: r.width, height: r.height } as Box };
    });
    const grid = document.querySelector("[data-stack-grid] > div") as HTMLElement;
    return { cards, grid: grid.style.backgroundPosition, vw: window.innerWidth, vh: window.innerHeight };
  });
}

function inside(b: Box, vw: number, vh: number) {
  return b.x >= 0 && b.y >= 0 && b.x + b.width <= vw && b.y + b.height <= vh;
}

test("landing how-it-works stack", async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-sticky-stage]")).toBeAttached();

  // just before the pin: stage is in flow but no card shows
  await pinAt(page, -0.02);
  let s = await state(page);
  expect(s.cards.some((c) => c.visible)).toBe(false);

  await pinAt(page, 0);
  s = await state(page);
  expect(s.cards.map((c) => c.visible)).toEqual([false, false, false]);

  const expectVisible = async (p: number, want: boolean[]) => {
    await pinAt(page, p);
    const st = await state(page);
    expect(st.cards.map((c) => c.visible), `p=${p}`).toEqual(want);
    st.cards.forEach((c, i) => {
      if (want[i]) expect(inside(c.box, st.vw, st.vh), `card ${i} at p=${p}`).toBe(true);
    });
  };
  await expectVisible(0.25, [true, false, false]);
  await expectVisible(0.5, [true, true, false]);
  await expectVisible(0.95, [true, true, true]);

  const grids: string[] = [];
  for (const p of [0.1, 0.2, 0.3]) {
    await pinAt(page, p);
    grids.push((await state(page)).grid);
  }
  expect(new Set(grids).size).toBe(3);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-sticky-list]")).toBeAttached();
  await expect(page.locator("[data-sticky-stage]")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  expect(errors, errors.join("\n")).toEqual([]);
});

test("landing how-it-works screenshots", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  for (const p of [0.05, 0.3, 0.55, 0.8, 0.98]) {
    await pinAt(page, p);
    await page.screenshot({ path: `tmp/f9b/p-${p}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("[data-sticky-list]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.locator("[data-sticky-list]").screenshot({ path: "tmp/f9b/list-390.png" });
});
