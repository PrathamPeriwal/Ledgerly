"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

const hiddenClip = {
  left: "inset(0 100% 0 0)",
  right: "inset(0 0 0 100%)",
  up: "inset(100% 0 0 0)",
  down: "inset(0 0 100% 0)",
} as const;

export function WipeReveal({
  children,
  delay = 0,
  duration = 0.8,
  direction = "left",
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: keyof typeof hiddenClip;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const show = reduced || inView;

  return (
    <motion.div
      ref={ref}
      className={cn("fx-wipe", className)}
      initial={{ clipPath: hiddenClip[direction] }}
      animate={{ clipPath: show ? "inset(0 0 0 0)" : hiddenClip[direction] }}
      transition={{
        duration: reduced ? 0 : duration,
        delay: show && !reduced ? delay : 0,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
