"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useAnimation, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export function RevealHeading({
  as = "h2",
  children,
  delay = 0,
  className,
}: {
  as?: HeadingTag;
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const Tag = as;
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { once: true, amount: 0.6 });
  const reduced = useReducedMotionSafe();
  const controls = useAnimation();

  useEffect(() => {
    if (!inView || reduced) return;
    let alive = true;

    const run = async () => {
      try {
        await controls.start({
          scaleX: 1,
          originX: 0,
          transition: { duration: 0.45, delay, ease: "easeInOut" },
        });
        if (!alive) return;
        controls.set({ originX: 1 });
        await controls.start({
          scaleX: 0,
          transition: { duration: 0.45, ease: "easeInOut" },
        });
      } catch {
        /* stopped on unmount */
      }
    };

    void run();
    return () => {
      alive = false;
      controls.stop();
    };
  }, [controls, delay, inView, reduced]);

  return (
    <div ref={rootRef} className="relative block w-full">
      <Tag className={cn("relative z-0 select-text", className)}>{children}</Tag>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0, originX: 0 }}
        animate={controls}
        className="fx-bar pointer-events-none absolute inset-0 z-10 bg-[#1A1B1C]"
      />
    </div>
  );
}
