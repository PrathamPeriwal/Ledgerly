"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const EVENT = "ledgerly:route-progress";

function emit(on: boolean) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: on }));
}

export function useRouteProgress() {
  const start = useCallback(() => emit(true), []);
  const done = useCallback(() => emit(false), []);
  return { start, done };
}

function samePage(url: URL) {
  return url.pathname === window.location.pathname && url.search === window.location.search;
}

export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const location = `${pathname}?${search.toString()}`;
  const locationRef = useRef(location);
  const [phase, setPhase] = useState<"off" | "run" | "done">("off");
  const [width, setWidth] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const listener = (event: Event) => {
      setPhase((event as CustomEvent<boolean>).detail ? "run" : "done");
    };
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, []);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (location === locationRef.current) return;
    locationRef.current = location;
    setPhase((current) => (current === "run" ? "done" : current));
  }, [location]);

  useEffect(() => {
    if (phase !== "run") return;
    const timer = window.setTimeout(() => setPhase("done"), 8000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const timer = window.setTimeout(() => setPhase("off"), 220);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "run") {
      if (phase === "done") setWidth(100);
      return;
    }
    if (reduced) {
      setWidth(100);
      return;
    }
    let value = 8;
    setWidth(8);
    const id = window.setInterval(() => {
      const remain = 80 - value;
      value = Math.min(80, value + Math.max(0.35, remain * 0.08));
      setWidth(value);
    }, 90);
    return () => window.clearInterval(id);
  }, [phase, reduced]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin || samePage(url)) return;
      emit(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (phase === "off") {
    return (
      <div className="sr-only" aria-live="polite">
        {""}
      </div>
    );
  }

  return (
    <>
      <div className="sr-only" aria-live="polite">
        {phase === "run" ? "LOADING" : ""}
      </div>
      <div
        data-testid="route-progress"
        className="pointer-events-none fixed left-0 top-0 z-[100] h-1 bg-[#FF5F14]"
        style={{
          width: `${width}%`,
          opacity: phase === "done" ? 0 : 1,
          transition: reduced ? "opacity 200ms linear" : "opacity 200ms linear, width 90ms linear",
        }}
      />
    </>
  );
}
