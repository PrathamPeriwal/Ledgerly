import type { ReactNode } from "react";
import { MarketingNav } from "@/components/marketing-nav";
import { Toaster } from "@/components/ui/sonner";

export default function DevLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MarketingNav />
      <main id="content" className="min-h-screen">
        {children}
      </main>
      <Toaster position="top-right" />
    </>
  );
}
