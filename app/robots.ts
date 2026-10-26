import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /sign-in and /sign-up stay crawlable on purpose: their noindex meta tag has to be seen.
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/account", "/transaction", "/demo", "/dev"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
