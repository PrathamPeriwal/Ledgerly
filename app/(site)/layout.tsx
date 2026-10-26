import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing-nav";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main id="content" className="min-h-screen">
        {children}
      </main>
    </>
  );
}
