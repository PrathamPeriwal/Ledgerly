// Technical SEO check against raw HTML (no JS, no cookies, redirects manual).
// Usage: BASE_URL=http://localhost:3000 node scripts/seo-check.mjs
// Expected canonical origin: NEXT_PUBLIC_SITE_URL, otherwise BASE_URL (same host the check fetches).
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || BASE).replace(/\/+$/, "");
const UA = { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" };

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
};
const get = (path, init = {}) =>
  fetch(path.startsWith("http") ? path : `${BASE}${path}`, { redirect: "manual", headers: UA, ...init });
const local = (url) => (url.startsWith(SITE) ? BASE + url.slice(SITE.length) : url);
const tags = (html, re) => [...html.matchAll(re)].map((m) => m[0]);
const attr = (tag, name) => tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`, "i"))?.slice(1).find(Boolean);
const meta = (html, key, by = "name") =>
  tags(html, /<meta\b[^>]*>/gi).filter((t) => attr(t, by) === key).map((t) => attr(t, "content"));
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const home = await get("/");
const html = await home.text();
check('"/" returns 200 without Location', home.status === 200 && !home.headers.get("location"), `status ${home.status}`);

const title = decode(html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "");
check("title length 30 to 60", title.length >= 30 && title.length <= 60, `${title.length}: ${title}`);
const desc = decode(meta(html, "description")[0] ?? "");
check("meta description 70 to 160", desc.length >= 70 && desc.length <= 160, String(desc.length));
const canon = tags(html, /<link\b[^>]*>/gi).filter((t) => attr(t, "rel") === "canonical").map((t) => attr(t, "href"));
check('one absolute canonical equal to SITE_URL + "/" (Next prints the root without the slash)', canon.length === 1 && canon[0].replace(/\/$/, "") === SITE, canon.join(","));
for (const p of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
  const v = meta(html, p, "property");
  check(p, v.length >= 1 && !!v[0] && (p !== "og:image" || /^https?:\/\//.test(v[0])), v[0]?.slice(0, 60));
}
check("twitter:card", meta(html, "twitter:card").length === 1, meta(html, "twitter:card")[0]);
check("html lang", /<html[^>]*\slang="[a-z-]+"/i.test(html));
check("viewport", meta(html, "viewport").length === 1);
check("theme-color", meta(html, "theme-color").length >= 1, meta(html, "theme-color")[0]);

const heads = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({
  level: Number(m[1]),
  text: m[2].replace(/<[^>]*>/g, "").trim(),
}));
const h1s = heads.filter((h) => h.level === 1);
check('exactly one h1 containing "KNOW WHERE IT WENT"', h1s.length === 1 && h1s[0].text.includes("KNOW WHERE IT WENT"), h1s.map((h) => h.text).join("|"));
let skipped = false;
heads.reduce((prev, h) => {
  if (h.level > prev + 1) skipped = true;
  return h.level;
}, 0);
check("no skipped heading levels", !skipped, heads.map((h) => h.level).join(""));

const ld = tags(html, /<script[^>]*application\/ld\+json[^>]*>[\s\S]*?<\/script>/gi).map((t) => t.replace(/^<script[^>]*>|<\/script>$/gi, ""));
let types = [];
try {
  types = ld.map((s) => JSON.parse(s)["@type"]);
} catch {
  types = [];
}
check("JSON-LD parses with WebSite and SoftwareApplication", types.includes("WebSite") && types.includes("SoftwareApplication"), types.join(","));

const signIn = await (await get("/sign-in")).text();
const robotsMeta = meta(signIn, "robots").join(",");
check("/sign-in has noindex robots meta", /noindex/.test(robotsMeta), robotsMeta);

const dash = await get("/dashboard");
let target = dash;
const loc = dash.headers.get("location");
if (loc && dash.status >= 300 && dash.status < 400) target = await get(local(new URL(loc, BASE).href));
const xrt = `${dash.headers.get("x-robots-tag") ?? ""} ${target.headers.get("x-robots-tag") ?? ""}`;
const tHtml = target.status === 200 ? await target.text() : "";
check("/dashboard (after one redirect) is not indexable", /noindex/.test(xrt) || /noindex/.test(meta(tHtml, "robots").join(",")), `x-robots-tag: ${xrt.trim() || "none"}`);

const robots = await (await get("/robots.txt")).text();
check("robots.txt has absolute Sitemap and Disallow /dashboard", /^Sitemap:\s*https?:\/\/\S+/im.test(robots) && /^Disallow:\s*\/dashboard\s*$/im.test(robots));
check("robots.txt does not disallow /sign-in or /sign-up", !/Disallow:\s*\/sign-(in|up)/i.test(robots));

const sm = await (await get("/sitemap.xml")).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
let smOk = urls.length > 0 && /<urlset/.test(sm);
for (const u of urls) smOk &&= (await get(local(u))).status === 200;
check("sitemap.xml parses and every URL returns 200", smOk, `${urls.length} urls`);

const og = meta(html, "og:image", "property")[0];
const ogRes = og ? await get(local(og)) : null;
check("og:image returns image/png", !!ogRes && ogRes.status === 200 && /image\/png/.test(ogRes.headers.get("content-type") ?? ""), ogRes?.headers.get("content-type"));

const lower = html.toLowerCase();
const need = ["features", "how it works", "scan a receipt or type it in", "nothing is saved until you confirm", "under the hood", "what is ledgerly?", "is it free?", "where is the code?"];
const missing = need.filter((s) => !lower.includes(s));
check("server HTML has sections, how-it-works copy, under the hood and FAQ", missing.length === 0, missing.join(", "));

const imgs = tags(html, /<img\b[^>]*>/gi);
check("every img has alt", imgs.every((t) => /\balt=/.test(t)), `${imgs.length} imgs`);

const hrefs = [...new Set(tags(html, /<a\b[^>]*>/gi).map((t) => attr(t, "href")).filter((h) => h && h.startsWith("/") && !h.startsWith("//")))].map((h) => h.split("#")[0] || "/");
const bad = [];
for (const h of new Set(hrefs)) {
  const r = await get(h);
  if (r.status === 404 || r.status >= 500) bad.push(`${h} ${r.status}`);
}
check("internal hrefs on / resolve without 404", bad.length === 0, bad.join(", ") || `${new Set(hrefs).size} links`);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const anchors = [...new Set(tags(html, /<a\b[^>]*>/gi).map((t) => attr(t, "href")).filter((h) => h && /^(\/)?#./.test(h)).map((h) => h.replace(/^\//, "").slice(1)))];
check("every anchor target id exists", anchors.every((a) => ids.has(a)), anchors.filter((a) => !ids.has(a)).join(", "));

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
