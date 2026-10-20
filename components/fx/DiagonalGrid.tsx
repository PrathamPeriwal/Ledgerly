"use client";

import { useLayoutEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

const DRIFT = 0.65;

export function DiagonalGrid({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const drift = useMotionValue(1);
  const range = useMotionValue(0);
  const reduced = useReducedMotionSafe();

  useLayoutEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => drift.set(media.matches || reduced ? 0 : 1);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [drift, reduced]);

  useLayoutEffect(() => {
    const section = hostRef.current?.closest("section");
    if (!section) return;
    const update = () => {
      range.set(Math.max(section.offsetHeight - window.innerHeight, 0));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [range]);

  const backgroundPosition = useTransform([progress, drift, range], ([value, enabled, distance]) => {
    const shift = -Number(value) * Number(distance) * DRIFT * Number(enabled);
    return `${shift}px ${shift}px`;
  });

  return (
    <div
      ref={hostRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <motion.div className="absolute inset-0 bg-grid-square" style={{ backgroundPosition }} />
    </div>
  );
}
