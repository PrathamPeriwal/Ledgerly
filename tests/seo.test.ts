import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { serializeJsonLd, softwareApplicationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";
import { SITE_URL, resolveSiteUrl } from "@/lib/site";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and trims trailing slashes", () => {
    expect(resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "https://a.example/", VERCEL_PROJECT_PRODUCTION_URL: "b.example" })).toBe("https://a.example");
  });
  it("uses https with the Vercel production host", () => {
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "b.example" })).toBe("https://b.example");
    expect(resolveSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "https://b.example/" })).toBe("https://b.example");
  });
  it("falls back to localhost", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
  });
});

describe("json-ld", () => {
  it("builds WebSite and SoftwareApplication without ratings", () => {
    const site = websiteJsonLd("https://x.test");
    const app = softwareApplicationJsonLd("https://x.test");
    expect(site["@type"]).toBe("WebSite");
    expect(app["@type"]).toBe("SoftwareApplication");
    expect(app.applicationCategory).toBe("FinanceApplication");
    expect(app.operatingSystem).toBe("Web");
    expect(app.offers).toMatchObject({ price: "0", priceCurrency: "INR" });
    expect(app.author.sameAs).toEqual(["https://github.com/PrathamPeriwal"]);
    expect(JSON.stringify(app)).not.toMatch(/"(aggregateRating|review)"/);
  });
  it("escapes < so data cannot close the script tag", () => {
    const out = serializeJsonLd({ a: "</script><b>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).a).toBe("</script><b>");
  });
});

describe("robots and sitemap", () => {
  it("allows / and disallows private routes, keeps auth pages crawlable", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rule.allow).toBe("/");
    expect(rule.disallow).toEqual(expect.arrayContaining(["/api/", "/dashboard", "/account", "/transaction", "/demo", "/dev"]));
    expect(rule.disallow).not.toContain("/sign-in");
    expect(rule.disallow).not.toContain("/sign-up");
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
  it("lists / and /privacy with absolute URLs", () => {
    const s = sitemap();
    expect(s.map((e) => e.url)).toEqual([`${SITE_URL}/`, `${SITE_URL}/privacy`]);
    expect(s[0]).toMatchObject({ priority: 1, changeFrequency: "weekly" });
    expect(s[1]).toMatchObject({ changeFrequency: "monthly" });
  });
});
