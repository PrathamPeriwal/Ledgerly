import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";

export default function NotFound() {
  return (
    <>
      <MarketingNav />
      <main id="content" className="min-h-screen">
        <div className="overflow-hidden px-6 py-16">
          <h1 className="display text-[28vw] leading-none">404</h1>
          <p className="mt-6 max-w-md text-base">This page is not on the ledger.</p>
          <Link
            href="/"
            className="label mt-8 inline-flex border-strong border-border bg-primary px-5 py-3 text-primary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Back home
          </Link>
        </div>
      </main>
    </>
  );
}
