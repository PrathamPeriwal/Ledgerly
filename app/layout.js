import { Geist_Mono, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
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
          <Header />
          <main className="min-h-screen">{children}</main>
          <Toaster position="top-right" />
          <footer className="mt-20 border-t-strong border-border bg-card py-12">
            <div className="container mx-auto px-4 text-center">
              <h3 className="label text-base">Ledgerly</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Smart financial management made simple
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Made by Pratham Periwal
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                © 2025 Ledgerly. All rights reserved.
              </p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}
