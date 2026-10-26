// Scroll jank on "/": scripted top-to-bottom scroll over 6 s, 3 runs, desktop and mobile, CPU throttled 4x.
// Usage: node scripts/scroll-jank.mjs [baseUrl]   (default http://localhost:3200)
import { chromium } from "@playwright/test";

const base = (process.argv[2] || "http://localhost:3200").replace(/\/$/, "");
const RUNS = 3;
const DURATION = 6000;
const BUCKETS = 10;
const viewports = [
  { name: "desktop 1440x900", opts: { viewport: { width: 1440, height: 900 } } },
  {
    name: "mobile 390x844",
    opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  },
];

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

async function run(browser, opts) {
  const context = await browser.newContext(opts);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.goto(`${base}/`, { waitUntil: "load" });
  await page.waitForTimeout(2500); // let deferred effects (cursor, grid drift) mount
  const result = await page.evaluate(
    ({ duration, buckets }) =>
      new Promise((resolve) => {
        const max = () => document.documentElement.scrollHeight - window.innerHeight;
        const frames = [];
        const tasks = [];
        const po = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) tasks.push({ d: e.duration, y: window.scrollY / Math.max(1, max()) });
        });
        po.observe({ entryTypes: ["longtask"] });
        window.scrollTo(0, 0);
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          frames.push({ d: now - last, y: window.scrollY / Math.max(1, max()) });
          last = now;
          window.scrollTo(0, p * max());
          if (p < 1) requestAnimationFrame(tick);
          else
            setTimeout(() => {
              po.disconnect();
              resolve({ frames: frames.slice(1), tasks, height: document.documentElement.scrollHeight, buckets });
            }, 300);
        };
        requestAnimationFrame(tick);
      }),
    { duration: DURATION, buckets: BUCKETS },
  );
  await context.close();
  return result;
}

const browser = await chromium.launch();
const out = [];
for (const vp of viewports) {
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    const r = await run(browser, vp.opts);
    const d = r.frames.map((f) => f.d);
    const bucketJank = Array(BUCKETS).fill(0);
    const bucketTask = Array(BUCKETS).fill(0);
    for (const f of r.frames) if (f.d > 50) bucketJank[Math.min(BUCKETS - 1, Math.floor(f.y * BUCKETS))] += 1;
    for (const t of r.tasks) bucketTask[Math.min(BUCKETS - 1, Math.floor(t.y * BUCKETS))] += t.d;
    runs.push({
      height: r.height,
      median: median(d),
      over167: d.filter((x) => x > 17.2).length / d.length,
      over50: d.filter((x) => x > 50).length / d.length,
      tasks: r.tasks.length,
      taskMs: r.tasks.reduce((n, t) => n + t.d, 0),
      bucketJank,
      bucketTask,
    });
  }
  const sum = (key, j) => runs.reduce((n, r) => n + r[key][j], 0);
  const height = runs[0].height;
  const clusters = Array.from({ length: BUCKETS }, (_, j) => ({
    from: Math.round((j / BUCKETS) * 100),
    to: Math.round(((j + 1) / BUCKETS) * 100),
    jank: sum("bucketJank", j),
    taskMs: Math.round(sum("bucketTask", j)),
  }))
    .filter((c) => c.jank > 0 || c.taskMs > 0)
    .sort((a, b) => b.jank + b.taskMs / 100 - (a.jank + a.taskMs / 100))
    .slice(0, 4);
  out.push(vp.name);
  console.log(`\n${vp.name} (CPU 4x, median of ${RUNS}, page height ${height}px)`);
  console.log(`  median frame time: ${median(runs.map((r) => r.median)).toFixed(1)} ms`);
  console.log(`  frames > 16.7 ms (+0.5 ms timer tolerance): ${(median(runs.map((r) => r.over167)) * 100).toFixed(1)}%`);
  console.log(`  frames > 50 ms: ${(median(runs.map((r) => r.over50)) * 100).toFixed(1)}%`);
  console.log(`  long tasks: ${median(runs.map((r) => r.tasks))}, total ${Math.round(median(runs.map((r) => r.taskMs)))} ms`);
  console.log(
    `  jank clusters (scroll %, frames>50ms / long-task ms, summed over runs): ${
      clusters.map((c) => `${c.from}-${c.to}%: ${c.jank} / ${c.taskMs}`).join("; ") || "none"
    }`,
  );
}
await browser.close();
