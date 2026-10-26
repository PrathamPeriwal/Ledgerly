import { AUTHOR_NAME, GITHUB_PROFILE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export function websiteJsonLd(url: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${url}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "en-IN",
  };
}

export function softwareApplicationJsonLd(url: string = SITE_URL) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: `${url}/`,
    description: SITE_DESCRIPTION,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    author: { "@type": "Person", name: AUTHOR_NAME, url: GITHUB_PROFILE_URL, sameAs: [GITHUB_PROFILE_URL] },
  };
}

/** JSON for a script tag: "<" is escaped so the data cannot close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
