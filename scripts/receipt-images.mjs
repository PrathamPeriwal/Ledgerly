import { chromium } from "@playwright/test";

const SUPERMARKET = `<h3>FRESHMART SUPERMARKET</h3><p>12 Market Road</p><p>Date: 2026-10-20</p>
<p>Milk 1L ........ 62.00</p><p>Bread ........ 45.00</p><p>Eggs x12 ........ 90.00</p><p>Rice 5kg ........ 410.00</p>
<p>Apples 1kg ........ 180.00</p><hr><p><b>TOTAL ........ INR 787.00</b></p>`;
const RESTAURANT = `<h3>SPICE GARDEN RESTAURANT</h3><p>Date: 2026-10-18</p>
<p>Paneer Tikka ........ 320.00</p><p>Butter Naan x2 ........ 120.00</p><p>Dal Makhani ........ 280.00</p>
<p>Subtotal ........ 720.00</p><p>Tip ........ 80.00</p><hr><p><b>TOTAL ........ INR 800.00</b></p>`;

/** Renders receipt-like PNGs (width px) with headless Chromium. Returns { supermarket, restaurant } Buffers. */
export async function renderReceipts(width = 600) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height: 500 } });
    const shoot = async (body) => {
      await page.setContent(
        `<body style="margin:0;padding:24px;background:#fff;font:20px monospace;width:${width - 48}px">${body}</body>`,
      );
      return page.screenshot({ type: "png", fullPage: true });
    };
    return { supermarket: await shoot(SUPERMARKET), restaurant: await shoot(RESTAURANT) };
  } finally {
    await browser.close();
  }
}
