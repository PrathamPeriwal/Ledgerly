import type { MetadataRoute } from "next";

function siteUrl() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!host) return "http://localhost:3000";
  return `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl()}/` }];
}
