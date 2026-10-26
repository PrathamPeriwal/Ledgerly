import { Suspense } from "react";
import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RouteProgress } from "@/components/route-progress";
import { DeferredFx } from "@/components/fx/DeferredFx";
import { MotionProvider } from "@/components/fx/MotionProvider";
import { PrivacyProvider } from "@/components/fx/Privacy";

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

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const metadataBase = new URL(
  productionHost
    ? `https://${String(productionHost).replace(/^https?:\/\//, "").replace(/\/$/, "")}`
    : "http://localhost:3000",
);

export const metadata = {
  metadataBase,
  title: {
    default: "Ledgerly",
    template: "%s | Ledgerly",
  },
  description: "Scan receipts, review them, and see what is left in your budget.",
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
