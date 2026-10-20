"use client";

import { useLayoutEffect } from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

const LINE = "#CBD1D8";

export function DiagonalGrid({
  progress,
  className,
}: {
  progress: MotionValue<number>;
  className?: string;
}) {
  const drift = useMotionValue(1);
  const reduced = useReducedMotionSafe();

  useLayoutEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => drift.set(media.matches || reduced ? 0 : 1);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [drift, reduced]);

  const x = useTransform([progress, drift], ([value, enabled]) => {
    return Number(value) * -384 * Number(enabled);
  });
  const y = useTransform([progress, drift], ([value, enabled]) => {
    return Number(value) * -384 * Number(enabled);
  });

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="fx-drift absolute"
        style={{
          x,
          y,
          top: "-24rem",
          left: "-24rem",
          width: "calc(100% + 48rem)",
          height: "calc(100% + 48rem)",
          backgroundImage: `linear-gradient(to right, ${LINE} 0.75px, transparent 0.75px), linear-gradient(to bottom, ${LINE} 0.75px, transparent 0.75px)`,
          backgroundSize: "8rem 8rem",
        }}
      />
    </div>
  );
}
