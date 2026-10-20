"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "motion/react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useReducedMotionSafe } from "./reduced";

export function Counter({
  value,
  format = formatCurrency,
  duration = 1.1,
  className,
}: {
  value: number;
  format?: typeof formatCurrency;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotionSafe();
  const [text, setText] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setText(format(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setText(format(latest)),
    });
    return () => controls.stop();
  }, [duration, format, inView, reduced, value]);

  return (
    <span ref={ref} className={cn("font-num", className)}>
      {text}
    </span>
  );
}
