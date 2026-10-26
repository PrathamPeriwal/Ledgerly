"use client";

import { useState } from "react";
import { PrivacyToggle } from "@/components/fx/Privacy";
import { UserMenu } from "@/components/user-menu";
import { NavBrand, NavItem } from "@/components/nav-parts";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function NavLinks({ stacked, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  const command = () => {
    onNavigate?.();
    window.dispatchEvent(new Event("ledgerly:command-menu"));
  };

  return (
    <>
      <NavItem href="/dashboard" stacked={stacked} onClick={onNavigate}>
        Dashboard
      </NavItem>
      <NavItem href="/dashboard#accounts" stacked={stacked} onClick={onNavigate}>
        Accounts
      </NavItem>
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
      <NavItem stacked={stacked} onClick={command}>
        ⌘K
      </NavItem>
      <NavItem href="/transaction/create" tone="orange" stacked={stacked} onClick={onNavigate}>
        Add transaction
      </NavItem>
      <div
        className={cn(
          "flex items-center border-border px-4",
          stacked ? "border-b-strong py-4" : "h-full border-l-strong",
        )}
      >
        <UserMenu />
      </div>
    </>
  );
}

/** Signed-in app nav (Clerk pieces live here). Used inside the (main) group. */
export function AppNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full border-b-strong border-border bg-card">
      <NavBrand />
      <div className="flex-1" aria-hidden />
      <nav aria-label="Primary" className="hidden h-full md:flex">
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
