const host = (value: string) => value.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/** Absolute site origin: NEXT_PUBLIC_SITE_URL, else the Vercel production host, else localhost. */
export function resolveSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${host(vercel)}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "Ledgerly";
export const SITE_TITLE = "Ledgerly: scan receipts, track spending, stay on budget";
export const SITE_DESCRIPTION =
  "Ledgerly is a personal finance app. Scan a receipt, review what it read, and see what is left in your monthly budget. A portfolio project.";
export const AUTHOR_NAME = "Pratham Periwal";
export const GITHUB_PROFILE_URL = "https://github.com/PrathamPeriwal";
export const GITHUB_REPO_URL = "https://github.com/PrathamPeriwal/Ledgerly";
/** Bump when the privacy page or the pages in the sitemap change. */
export const LAST_UPDATED = "2026-10-26";

export const absoluteUrl = (path: string, base: string = SITE_URL) => `${base}${path === "/" ? "/" : path}`;
