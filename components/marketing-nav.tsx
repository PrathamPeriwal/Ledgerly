"use client";

import { useState, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { NavBrand, NavItem } from "@/components/nav-parts";
import { useSessionHint } from "@/components/auth-hint";

const MobileMenu = dynamic(() => import("./marketing-menu").then((m) => m.MarketingMenu), {
  ssr: false,
}) as ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void }>;

export function MarketingLinks({ stacked, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  const signedIn = useSessionHint();
  return (
    <>
      <NavItem href="#features" stacked={stacked} onClick={onNavigate}>
        Features
      </NavItem>
      <NavItem href="#how" stacked={stacked} onClick={onNavigate}>
        How it works
      </NavItem>
      {signedIn ? (
        <NavItem href="/dashboard" prefetch={false} stacked={stacked} onClick={onNavigate}>
          Dashboard
        </NavItem>
      ) : (
        <NavItem href="/sign-in" prefetch={false} stacked={stacked} onClick={onNavigate}>
          Login
        </NavItem>
      )}
      <NavItem href="/demo" prefetch={false} tone="orange" stacked={stacked} onClick={onNavigate}>
        Try the demo
      </NavItem>
    </>
  );
}

/** Static marketing nav: no Clerk code. Used on "/", not-found and dev pages. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full border-b-strong border-border bg-card">
      <NavBrand />
      <div className="flex-1" aria-hidden />
      <nav aria-label="Primary" className="hidden h-full md:flex">
        <MarketingLinks />
      </nav>
      <button
        type="button"
        className="label h-full shrink-0 border-l-strong border-border px-4 hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={() => {
          setMenuMounted(true);
          setOpen(true);
        }}
      >
        Menu
      </button>
      {menuMounted ? <MobileMenu open={open} onOpenChange={setOpen} /> : null}
    </header>
  );
}
