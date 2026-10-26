"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function NavItem({
  href,
  children,
  tone,
  onClick,
  stacked,
  prefetch,
}: {
  href?: string;
  children: ReactNode;
  tone?: "orange";
  onClick?: () => void;
  stacked?: boolean;
  prefetch?: boolean;
}) {
  const className = cn(
    "label items-center whitespace-nowrap border-border transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
    stacked ? "flex w-full border-b-strong px-4 py-4" : "inline-flex h-full shrink-0 border-l-strong px-4",
    tone === "orange" && "bg-primary text-primary-foreground",
  );
  const cursor = tone === "orange" ? "GO" : undefined;

  if (href?.startsWith("#")) {
    return (
      <a href={href} className={className} data-cursor={cursor} onClick={onClick}>
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} prefetch={prefetch} className={className} data-cursor={cursor} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={className} data-cursor={cursor} onClick={onClick}>
      {children}
    </button>
  );
}

export function NavBrand() {
  return (
    <Link
      href="/"
      className="flex h-full shrink-0 items-center gap-2 border-r-strong border-border px-4 transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-primary" />
      <span className="display text-xl">Ledgerly</span>
    </Link>
  );
}
