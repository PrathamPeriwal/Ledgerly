"use client";

import { useEffect, useLayoutEffect } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

const DRIFT = 0.65;

function useDriftEnabled() {
  const drift = useMotionValue(1);
  const reduced = useReducedMotionSafe();

  useLayoutEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => drift.set(media.matches || reduced ? 0 : 1);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [drift, reduced]);

  return drift;
}

export function BgGridDrift() {
  const { scrollY } = useScroll();
  const drift = useDriftEnabled();

  useEffect(() => {
    const apply = () => {
      const shift = -scrollY.get() * DRIFT * drift.get();
      document.documentElement.style.setProperty("--grid-shift", `${shift}px`);
    };
    apply();
    const unsubY = scrollY.on("change", apply);
    const unsubD = drift.on("change", apply);
    return () => {
      unsubY();
      unsubD();
      document.documentElement.style.removeProperty("--grid-shift");
    };
  }, [scrollY, drift]);

  return null;
}

const SPRING = { stiffness: 120, damping: 30, mass: 0.4 };

export function GridBackground({
  variant = "vertical",
  className,
}: {
  variant?: "vertical" | "square";
  className?: string;
}) {
  const { scrollY: rawY } = useScroll();
  const scrollY = useSpring(rawY, SPRING);
  const drift = useDriftEnabled();
  const backgroundPosition = useTransform([scrollY, drift], ([scroll, enabled]) => {
    const shift = -Number(scroll) * DRIFT * Number(enabled);
    const y = variant === "square" ? shift : 0;
    return `${shift}px ${y}px`;
  });

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <motion.div
        className={cn("absolute inset-0", variant === "square" ? "bg-grid-square" : "bg-grid")}
        style={{ backgroundPosition }}
      />
    </div>
  );
}
