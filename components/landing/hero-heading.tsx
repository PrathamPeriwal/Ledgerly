import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./hero-heading.css";

/** Pure-CSS version of RevealHeading for the hero: text is in the HTML, the bar sweeps on first paint. */
export function HeroHeading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="relative block w-full">
      <h1 className={cn("relative z-0 select-text", className)}>{children}</h1>
      <span aria-hidden className="hero-bar pointer-events-none absolute inset-0 z-10 bg-[#1A1B1C]" />
    </div>
  );
}
