"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useReducedMotionSafe } from "./reduced";

export function CustomCursor() {
  const reduced = useReducedMotionSafe();
  const [fine, setFine] = useState(false);
  const [inside, setInside] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const labelRef = useRef<string | null>(null);
  const insideRef = useRef(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 320, damping: 32, mass: 0.35 });
  const springY = useSpring(y, { stiffness: 320, damping: 32, mass: 0.35 });

  useEffect(() => {
    const pointer = window.matchMedia("(pointer: fine)");
    const updatePointer = () => setFine(pointer.matches);
    updatePointer();
    pointer.addEventListener("change", updatePointer);

    const onMove = (event: PointerEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
      if (!insideRef.current) {
        insideRef.current = true;
        setInside(true);
      }
      const target = event.target instanceof Element ? event.target.closest("[data-cursor]") : null;
      const next = target?.getAttribute("data-cursor") || null;
      if (next !== labelRef.current) {
        labelRef.current = next;
        setLabel(next);
      }
    };

    const onLeave = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      insideRef.current = false;
      setInside(false);
    };

    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      pointer.removeEventListener("change", updatePointer);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  if (!fine) return null;

  const posX = reduced ? x : springX;
  const posY = reduced ? y : springY;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[80]"
      style={{ x: posX, y: posY, opacity: inside ? 1 : 0 }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="relative h-3 w-3"
          animate={{ opacity: label ? 0 : 1, scale: label ? 0.4 : 1 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
        >
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-[#1A1B1C]" />
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-[#1A1B1C]" />
        </motion.div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#1A1B1C] bg-[#E3E7EB]/80"
            animate={{ opacity: label ? 1 : 0, scale: label ? 1 : 0.2 }}
            transition={{ duration: reduced ? 0 : 0.22 }}
          >
            <span className="max-w-[48px] truncate text-center text-[9px] font-semibold uppercase leading-none tracking-wide text-[#1A1B1C]">
              {label}
            </span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
