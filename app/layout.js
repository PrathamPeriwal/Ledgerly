import { Suspense } from "react";
import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { RouteProgress } from "@/components/route-progress";
import { ReloadOnRestore } from "@/components/reload-on-restore";
import { BgGridDrift } from "@/components/fx/GridBackground";
import { CustomCursor } from "@/components/fx/CustomCursor";
import { PrivacyProvider } from "@/components/fx/Privacy";
import { SiteNav } from "@/components/site-nav";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
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
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FF5F14",
          colorPrimaryForeground: "#1A1B1C",
          colorText: "#1A1B1C",
          colorForeground: "#1A1B1C",
          colorTextSecondary: "#1A1B1C",
          colorMutedForeground: "#1A1B1C",
          colorBackground: "#FFFFFF",
          colorInputBackground: "#FFFFFF",
          colorInput: "#FFFFFF",
          colorInputText: "#1A1B1C",
          colorInputForeground: "#1A1B1C",
          colorRing: "#FF5F14",
          colorShadow: "transparent",
          borderRadius: "0px",
          fontFamily: "var(--font-sans), sans-serif",
        },
        elements: {
          card: "shadow-none rounded-none border-[3px] border-solid border-[#1A1B1C]",
          formButtonPrimary:
            "bg-[#FF5F14] text-[#1A1B1C] border-2 border-solid border-[#1A1B1C] uppercase shadow-none rounded-none hover:bg-[#1A1B1C] hover:text-white",
          formFieldInput:
            "border-2 border-solid border-[#1A1B1C] rounded-none shadow-none focus:ring-2 focus:ring-[#FF5F14]",
          footerActionLink: "text-[#1A1B1C] underline",
          formFieldAction: "text-[#1A1B1C] underline",
          formResendCodeLink: "text-[#1A1B1C] underline",
          socialButtonsBlockButton:
            "bg-white text-[#1A1B1C] border-2 border-solid border-[#1A1B1C] rounded-none shadow-none",
          headerTitle: "text-[#1A1B1C]",
          headerSubtitle: "text-[#1A1B1C]",
        },
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" className={`${hanken.variable} ${geistMono.variable} ${rupee.variable}`}>
        <body className="min-h-screen bg-background bg-grid font-sans text-foreground">
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <ReloadOnRestore />
          <PrivacyProvider>
            <a
              href="#content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[60] focus:border-[3px] focus:border-[#1A1B1C] focus:bg-white focus:px-3 focus:py-2 focus:text-[#1A1B1C]"
            >
              Skip to content
            </a>
            <SiteNav />
            <main id="content" className="min-h-screen">
              {children}
            </main>
            <Toaster position="top-right" />
            <CustomCursor />
            <BgGridDrift />
          </PrivacyProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
