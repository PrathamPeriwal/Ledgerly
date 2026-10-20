"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { PrivacyToggle } from "@/components/fx/Privacy";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const userButtonAppearance = {
  elements: {
    avatarBox: "h-8 w-8 rounded-none",
    userButtonTrigger: "rounded-none focus:shadow-none",
    userButtonPopoverCard: "rounded-none border-[3px] border-[#1A1B1C] shadow-none",
    userButtonPopoverActionButton: "rounded-none",
  },
};

function Item({
  href,
  children,
  tone,
  onClick,
  stacked,
}: {
  href?: string;
  children: ReactNode;
  tone?: "orange";
  onClick?: () => void;
  stacked?: boolean;
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
      <Link href={href} className={className} data-cursor={cursor} onClick={onClick}>
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

function NavLinks({ stacked, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  const command = () => {
    onNavigate?.();
    window.dispatchEvent(new Event("ledgerly:command-menu"));
  };

  return (
    <>
      <SignedOut>
        <Item href="#features" stacked={stacked} onClick={onNavigate}>
          Features
        </Item>
        <Item href="#how" stacked={stacked} onClick={onNavigate}>
          How it works
        </Item>
        <Item href="/sign-in" stacked={stacked} onClick={onNavigate}>
          Login
        </Item>
        <Item href="/sign-in" tone="orange" stacked={stacked} onClick={onNavigate}>
          Try the demo
        </Item>
      </SignedOut>
      <SignedIn>
        <Item href="/dashboard" stacked={stacked} onClick={onNavigate}>
          Dashboard
        </Item>
        <Item href="/dashboard#accounts" stacked={stacked} onClick={onNavigate}>
          Accounts
        </Item>
        <div
          className={cn(
            "flex items-stretch border-border",
            stacked ? "border-b-strong" : "h-full border-l-strong",
          )}
        >
          <PrivacyToggle
            className={cn(
              "rounded-none border-0 bg-transparent hover:bg-accent hover:text-accent-foreground",
              stacked ? "h-auto w-full justify-start px-4 py-4" : "h-full px-4",
            )}
          />
        </div>
        <Item stacked={stacked} onClick={command}>
          ⌘K
        </Item>
        <Item href="/transaction/create" tone="orange" stacked={stacked} onClick={onNavigate}>
          Add transaction
        </Item>
        <div
          className={cn(
            "flex items-center border-border px-4",
            stacked ? "border-b-strong py-4" : "h-full border-l-strong",
          )}
        >
          <UserButton appearance={userButtonAppearance} />
        </div>
      </SignedIn>
    </>
  );
}

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full border-b-strong border-border bg-card">
      <Link
        href="/"
        className="flex h-full shrink-0 items-center gap-2 border-r-strong border-border px-4 transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-primary" />
        <span className="display text-xl">Ledgerly</span>
      </Link>
      <div className="flex-1" aria-hidden />
      <nav className="hidden h-full md:flex">
        <NavLinks />
      </nav>
      <button
        type="button"
        className="label h-full shrink-0 border-l-strong border-border px-4 hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={() => setOpen(true)}
      >
        Menu
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="h-full w-full max-w-none gap-0 p-0 sm:max-w-none">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Site links</SheetDescription>
          <div className="flex h-full flex-col pt-14">
            <nav className="flex flex-col border-t-strong border-border">
              <NavLinks stacked onNavigate={() => setOpen(false)} />
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
