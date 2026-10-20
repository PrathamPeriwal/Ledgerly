"use client";

import { Children, useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { cn } from "@/lib/utils";
import "./fx.css";
import { useReducedMotionSafe } from "./reduced";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduced = useReducedMotionSafe();
  const show = reduced || inView;

  return (
    <motion.div
      ref={ref}
      className={cn("fx-reveal", className)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 16 }}
      transition={{
        duration: reduced ? 0 : 0.55,
        delay: show && !reduced ? delay : 0,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, index) => (
        <Reveal key={index} delay={index * 0.08}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
