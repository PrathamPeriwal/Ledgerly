"use client";

import { useLayoutEffect } from "react";
import { motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

const LINE = "#CBD1D8";
const TILE = "8rem";

export function GridBackground({
  variant = "vertical",
  className,
}: {
  variant?: "vertical" | "square";
  className?: string;
}) {
  const { scrollYProgress } = useScroll();
  const drift = useMotionValue(1);
  const reduced = useReducedMotionSafe();
  const travel = variant === "square" ? -256 : -128;

  useLayoutEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => drift.set(media.matches || reduced ? 0 : 1);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [drift, reduced]);

  const x = useTransform([scrollYProgress, drift], ([progress, enabled]) => {
    return Number(progress) * travel * Number(enabled);
  });
  const y = useTransform([scrollYProgress, drift], ([progress, enabled]) => {
    if (variant !== "square") return 0;
    return Number(progress) * travel * Number(enabled);
  });

  const backgroundImage =
    variant === "square"
      ? `linear-gradient(to right, ${LINE} 0.75px, transparent 0.75px), linear-gradient(to bottom, ${LINE} 0.75px, transparent 0.75px)`
      : `linear-gradient(to right, ${LINE} 1px, transparent 1px)`;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className="fx-drift absolute"
        style={{
          x,
          y,
          top: "-16rem",
          left: "-16rem",
          width: "calc(100% + 32rem)",
          height: "calc(100% + 32rem)",
          backgroundImage,
          backgroundSize: variant === "square" ? `${TILE} ${TILE}` : `${TILE} 100%`,
        }}
      />
    </div>
  );
}
