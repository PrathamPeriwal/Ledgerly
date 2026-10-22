"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PROTECTED = [/^\/dashboard(\/|$)/, /^\/account(\/|$)/, /^\/transaction(\/|$)/];

export function ReloadOnRestore() {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    if (!PROTECTED.some((pattern) => pattern.test(pathname))) return;
    const back = `${window.location.pathname}${window.location.search}`;
    window.location.replace(`/sign-in?redirect_url=${encodeURIComponent(back)}`);
  }, [isLoaded, isSignedIn, pathname]);

  return null;
}
