import { Suspense } from "react";
import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RouteProgress } from "@/components/route-progress";
import { DeferredFx } from "@/components/fx/DeferredFx";
import { MotionProvider } from "@/components/fx/MotionProvider";
import { PrivacyProvider } from "@/components/fx/Privacy";
import { AUTHOR_NAME, GITHUB_PROFILE_URL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const rupee = localFont({
  src: [
    { path: "./fonts/rupee-400.ttf", weight: "400" },
    { path: "./fonts/rupee-500.ttf", weight: "500" },
    { path: "./fonts/rupee-600.ttf", weight: "600" },
    { path: "./fonts/rupee-700.ttf", weight: "700" },
  ],
  variable: "--font-rupee",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+20B9" }],
});

const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR_NAME, url: GITHUB_PROFILE_URL }],
  creator: AUTHOR_NAME,
  category: "finance",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // The image comes from app/opengraph-image.tsx (size, type and alt are exported there).
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  ...(google || bing
    ? {
        verification: {
          ...(google ? { google } : {}),
          ...(bing ? { other: { "msvalidate.01": bing } } : {}),
        },
      }
    : {}),
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#E3E7EB",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${hanken.variable} ${geistMono.variable} ${rupee.variable}`}>
      <body className="min-h-screen bg-background bg-grid font-sans text-foreground">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <MotionProvider>
          <PrivacyProvider>
            <a
              href="#content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:border-[3px] focus:border-[#1A1B1C] focus:bg-white focus:px-3 focus:py-2 focus:text-[#1A1B1C]"
            >
              Skip to content
            </a>
            {children}
            <DeferredFx />
          </PrivacyProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
