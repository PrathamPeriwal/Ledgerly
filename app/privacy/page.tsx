import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing-nav";
import { SiteFooter } from "@/components/site-footer";
import { GITHUB_REPO_URL, LAST_UPDATED, SITE_NAME, absoluteUrl } from "@/lib/site";

const description =
  "What Ledgerly stores, which services handle your data, and what it does not keep. A plain-language privacy notice for a portfolio project.";

export const metadata: Metadata = {
  title: "Privacy",
  description,
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: absoluteUrl("/privacy"),
    title: `Privacy | ${SITE_NAME}`,
    description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Ledgerly: know where it went." }],
  },
  twitter: { card: "summary_large_image", title: `Privacy | ${SITE_NAME}`, description, images: ["/twitter-image"] },
};

const SECTIONS: [string, string[]][] = [
  [
    "What this is",
    [
      "Ledgerly is a portfolio project, not financial advice and not a bank. It is built and run by one person. This page says what the app stores and which services touch your data.",
    ],
  ],
  [
    "Your account",
    [
      "Sign-in is handled by Clerk (email and password, or OAuth). Clerk stores your credentials and sets a session cookie. Ledgerly keeps a copy of your Clerk user id, email, name and profile image URL in its own database so your data can be linked to you.",
    ],
  ],
  [
    "Your finances",
    [
      "Accounts, transactions and budgets you enter are stored in a Postgres database hosted on Supabase. Amounts are in Indian rupees.",
    ],
  ],
  [
    "Receipt images",
    [
      "When you scan a receipt, the photo is sent to Google Gemini so it can read the amount, date, merchant and category. The app does not save the image. Only the fields you review and confirm are stored as a transaction. The receipt link field in the database is not used.",
    ],
  ],
  [
    "Email",
    ["Monthly reports and budget alerts are sent through Resend, which receives your email address and the message content."],
  ],
  [
    "Abuse protection and hosting",
    [
      "Arcjet checks requests to the API and demo for bots and abuse, so it sees request details such as the IP address and browser. The app is hosted on Vercel, which handles requests and keeps standard server logs.",
    ],
  ],
  [
    "Demo data",
    [
      "The demo uses made-up sample data in a shared demo account. Do not enter real information there. The sample data is reset every night.",
    ],
  ],
  [
    "Analytics and ads",
    ["There is no advertising and no analytics script on the landing page."],
  ],
];

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main id="content" className="min-h-screen px-4 py-16 md:px-8 md:py-24">
        <h1 className="display text-5xl md:text-8xl">PRIVACY.</h1>
        <p className="label mt-4">LAST UPDATED {LAST_UPDATED}</p>
        <div className="mt-10 grid max-w-3xl gap-[3px] border-[3px] border-[#1A1B1C] bg-[#1A1B1C]">
          {SECTIONS.map(([heading, paragraphs]) => (
            <section key={heading} className="bg-white p-6">
              <h2 className="label">{heading}</h2>
              {paragraphs.map((text) => (
                <p key={text} className="mt-3 text-base">
                  {text}
                </p>
              ))}
            </section>
          ))}
          <section className="bg-white p-6">
            <h2 className="label">Contact</h2>
            <p className="mt-3 text-base">
              Questions about your data? Open an issue on the{" "}
              <a href={`${GITHUB_REPO_URL}/issues`} rel="noopener noreferrer" className="underline underline-offset-2">
                Ledgerly GitHub repository
              </a>
              .
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
