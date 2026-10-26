"use client";

import { useTransform, type MotionValue } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import "./fx.css";

/** Square grid that drifts diagonally; `offset` is the drift distance in px. */
export function DiagonalGrid({
  offset,
  className,
}: {
  offset: MotionValue<number>;
  className?: string;
}) {
  const backgroundPosition = useTransform(offset, (v) => `${-v}px ${-v}px`);
  return (
    <div
      data-stack-grid="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <m.div className="absolute inset-0 bg-grid-square" style={{ backgroundPosition }} />
    </div>
  );
}
