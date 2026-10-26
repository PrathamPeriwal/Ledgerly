import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppClerkProvider } from "@/components/app-clerk-provider";
import { MarketingNav } from "@/components/marketing-nav";

export const metadata: Metadata = { title: "Demo", alternates: { canonical: "/demo" }, robots: { index: false, follow: false } };

export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <AppClerkProvider>
      <MarketingNav />
      <main id="content" className="min-h-screen">
        {children}
      </main>
    </AppClerkProvider>
  );
}
