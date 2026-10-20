import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
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

export const metadata = {
  title: "Ledgerly",
  description: "One stop Finance Platform",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#FF5F14",
        },
      }}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
    >
      <html lang="en" className={`${hanken.variable} ${geistMono.variable}`}>
        <body className="min-h-screen bg-background bg-grid font-sans text-foreground">
          <PrivacyProvider>
            <SiteNav />
            <main className="min-h-screen">{children}</main>
            <Toaster position="top-right" />
            <CustomCursor />
            <BgGridDrift />
          </PrivacyProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
