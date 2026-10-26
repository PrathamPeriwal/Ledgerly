// Lab perf for signed-out "/": 3 Lighthouse runs (performance, seo, accessibility, best-practices; mobile defaults), medians.
// Also prints a cookieless Googlebot fetch of "/" (redirect manual).
// Usage: node scripts/perf-landing.mjs [baseUrl]   (default http://localhost:3200)
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = (process.argv[2] || "http://localhost:3200").replace(/\/$/, "");
const RUNS = 3;
const dir = mkdtempSync(join(tmpdir(), "lh-"));
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const rows = [];
const failing = new Map();

const bot = await fetch(`${base}/`, {
  redirect: "manual",
  headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
});
const html = await bot.text();
console.log(`Googlebot (no cookies, redirect manual): status ${bot.status}, Location ${bot.headers.get("location") ?? "(none)"}, content-length ${bot.headers.get("content-length") ?? `(chunked, body ${html.length} B)`}, cache-control ${bot.headers.get("cache-control") ?? "(none)"}, x-vercel-cache ${bot.headers.get("x-vercel-cache") ?? "(none)"}`);
console.log(`HTML size: ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);

for (let i = 0; i < RUNS; i += 1) {
  const out = join(dir, `r${i}.json`);
  execSync(
    `npx --yes lighthouse "${base}/" --only-categories=performance,seo,accessibility,best-practices --output=json --output-path="${out}" --chrome-flags="--headless=new --no-sandbox" --quiet`,
    { stdio: "ignore", shell: true },
  );
  const lh = JSON.parse(readFileSync(out, "utf8"));
  const a = lh.audits;
  const reqs = a["network-requests"]?.details?.items ?? [];
  const js = reqs.filter((r) => r.resourceType === "Script");
  let lcpSel = "";
  let phases = {};
  const lcpEl = a["largest-contentful-paint-element"]?.details?.items ?? [];
  for (const item of lcpEl) {
    if (item.type === "table" && item.items) {
      const first = item.items[0];
      if (first?.node?.selector) lcpSel = first.node.selector;
      if (item.headings?.[0]?.key === "phase") {
        for (const p of item.items) phases[p.phase] = p.timing;
      }
    }
    if (item.node?.selector) lcpSel = item.node.selector;
  }
  const lcpIns = a["lcp-breakdown-insight"]?.details?.items ?? [];
  for (const item of lcpIns) {
    if (item.type === "table") {
      for (const p of item.items ?? []) phases[p.label || p.phase] = p.duration ?? p.timing;
    }
  }
  const unused = (a["unused-javascript"]?.details?.items ?? []).map((u) => ({
    url: u.url.replace(base, ""),
    kb: Math.round((u.totalBytes || 0) / 1024),
    wasted: Math.round((u.wastedBytes || 0) / 1024),
  }));
  rows.push({
    score: Math.round((lh.categories.performance.score ?? 0) * 100),
    seo: Math.round(lh.categories.seo.score * 100),
    a11y: Math.round(lh.categories.accessibility.score * 100),
    bp: Math.round(lh.categories["best-practices"].score * 100),
    fcp: a["first-contentful-paint"].numericValue,
    lcp: a["largest-contentful-paint"].numericValue,
    tbt: a["total-blocking-time"].numericValue,
    cls: a["cumulative-layout-shift"].numericValue,
    jsKb: js.reduce((n, r) => n + (r.transferSize || 0), 0) / 1024,
    requests: reqs.length,
    lcpSel,
    phases,
    clerk: reqs.filter((r) => /clerk/i.test(r.url)).map((r) => r.url.replace(/\?.*/, "")),
    fonts: reqs.filter((r) => r.resourceType === "Font" || /\.woff2?|\.ttf/.test(r.url)).map((r) => r.url.replace(base, "")),
    scripts: js
      .map((r) => ({ url: r.url.replace(base, ""), kb: Math.round((r.transferSize || 0) / 1024) }))
      .sort((x, y) => y.kb - x.kb)
      .slice(0, 8),
    unused,
  });
}

const m = (k) => median(rows.map((r) => r[k]));
const mid = rows.slice().sort((x, y) => x.lcp - y.lcp)[Math.floor(RUNS / 2)];
const phaseKeys = [...new Set(rows.flatMap((r) => Object.keys(r.phases)))];
console.log(`Lab run (local, mobile defaults), base ${base}, median of ${RUNS}`);
console.log(`scores: performance ${m("score")}, seo ${m("seo")}, accessibility ${m("a11y")}, best-practices ${m("bp")}`);
console.log("Failing SEO / accessibility / best-practices audits (any run):");
for (const [k, v] of failing) console.log(`  ${k} - ${v}`);
console.log(`FCP: ${Math.round(m("fcp"))} ms`);
console.log(`LCP: ${Math.round(m("lcp"))} ms`);
console.log(`TBT: ${Math.round(m("tbt"))} ms`);
console.log(`CLS: ${m("cls").toFixed(3)}`);
console.log(`JS transfer: ${m("jsKb").toFixed(0)} KB`);
console.log(`requests: ${m("requests")}`);
console.log(`LCP element: ${mid.lcpSel || "(unknown)"}`);
for (const k of phaseKeys) {
  console.log(`LCP phase ${k}: ${Math.round(median(rows.map((r) => Number(r.phases[k]) || 0)))} ms`);
}
console.log(`Clerk requests (run ${RUNS}): ${mid.clerk.length}`);
for (const u of mid.clerk) console.log(`  ${u}`);
console.log(`Font requests: ${mid.fonts.length}`);
for (const u of mid.fonts) console.log(`  ${u}`);
console.log("Heaviest JS (median run):");
for (const s of mid.scripts.slice(0, 5)) console.log(`  ${s.kb} KB ${s.url}`);
console.log("Unused JS (median run, KB total / wasted):");
for (const u of mid.unused.slice(0, 5)) console.log(`  ${u.kb} / ${u.wasted} ${u.url}`);
