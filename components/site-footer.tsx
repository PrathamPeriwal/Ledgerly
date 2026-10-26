import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/site";

const linkClass =
  "label block border-b-strong border-border px-4 py-4 transition-colors hover:bg-accent hover:text-accent-foreground last:border-b-0";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="grid border-strong border-border bg-card md:grid-cols-3">
        <div className="flex flex-col justify-between gap-8 border-b-strong border-border p-6 md:border-b-0 md:border-r-strong">
          <p className="display text-4xl md:text-5xl">Scan. Review. Track.</p>
          <Link
            href="/demo"
            prefetch={false}
            data-cursor="GO"
            className="label inline-flex w-fit border-strong border-border bg-primary px-4 py-3 text-primary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Try the demo
          </Link>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-col border-b-strong border-border md:border-b-0 md:border-r-strong"
        >
          <Link className={linkClass} href="/#features" prefetch={false}>
            Features
          </Link>
          <Link className={linkClass} href="/#how" prefetch={false}>
            How it works
          </Link>
          <Link className={linkClass} href="/#faq" prefetch={false}>
            FAQ
          </Link>
          <Link className={linkClass} href="/privacy" prefetch={false}>
            Privacy
          </Link>
          <a className={linkClass} href={GITHUB_REPO_URL} rel="noopener noreferrer">
            GitHub
          </a>
        </nav>
        <div className="flex flex-col text-sm">
          <p className="border-b-strong border-border px-4 py-4">
            Built with Next.js, Prisma, Supabase, Clerk, Inngest, Gemini
          </p>
          <p className="px-4 py-4">{year}</p>
        </div>
      </div>
      <div className="overflow-hidden bg-[#1A1B1C] text-white" aria-hidden>
        <p
          className="display whitespace-nowrap"
          style={{ fontSize: "22vw", lineHeight: 0.85, height: "0.75em" }}
        >
          LEDGERLY
        </p>
      </div>
    </footer>
  );
}
