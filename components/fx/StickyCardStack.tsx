"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { DiagonalGrid } from "./DiagonalGrid";
import { RevealGroup } from "./Reveal";

const INK = "#1A1B1C";

const FILLS = {
  orange: { background: "#FF5F14", color: INK },
  ink: { background: INK, color: "#FFFFFF" },
  white: { background: "#FFFFFF", color: INK },
} as const;

export type StickyCard = {
  bg: keyof typeof FILLS;
  content: ReactNode;
  className?: string;
};

const PLACES = [
  { width: "68%", height: "74%", left: "6%", top: "10%" },
  { width: "56%", height: "62%", left: "36%", top: "28%" },
  { width: "50%", height: "56%", left: "14%", top: "8%" },
];

function place(index: number) {
  return (
    PLACES[index] ?? {
      width: `${62 - (index % 3) * 4}%`,
      height: `${66 - (index % 3) * 4}%`,
      left: index % 2 ? "32%" : "12%",
      top: `${10 + (index % 3) * 7}%`,
    }
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function StackCard({
  card,
  index,
  total,
  progress,
}: {
  card: StickyCard;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const box = place(index);
  const span = 1 / total;
  const local = (value: number) => clamp((value - index * span) / span, 0, 1);
  const after = (value: number) =>
    index < total - 1 ? clamp((value - (index + 1) * span) / span, 0, 1) : 0;
  const x = useTransform(progress, (value) =>
    index === 0 ? "0vw" : `${(1 - local(value)) * 40}vw`,
  );
  const y = useTransform(progress, (value) =>
    index === 0 ? "0vh" : `${(1 - local(value)) * 120}vh`,
  );
  const scale = useTransform(progress, (value) => {
    const base = index === 0 ? 1 : 0.92 + local(value) * 0.08;
    return base * (1 - after(value) * 0.05);
  });
  const dim = useTransform(progress, (value) => after(value) * 0.35);
  return (
    <motion.article
      data-sticky-card="true"
      className={cn("absolute overflow-hidden border-[3px] border-[#1A1B1C] p-8", card.className)}
      style={{
        ...box,
        x,
        y,
        scale,
        zIndex: index + 1,
        background: FILLS[card.bg].background,
        color: FILLS[card.bg].color,
      }}
    >
      {card.content}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#1A1B1C]"
        style={{ opacity: dim }}
      />
    </motion.article>
  );
}

export function StickyCardStack({
  cards,
  className,
}: {
  cards: StickyCard[];
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  useLayoutEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCompact(mobile.matches || reduce.matches);
    update();
    mobile.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      mobile.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  if (cards.length === 0) return null;

  if (compact) {
    return (
      <section ref={ref} className={className}>
        <RevealGroup className="flex flex-col gap-6 px-6 py-10">
          {cards.map((card, index) => (
            <article
              key={index}
              data-sticky-card="true"
              className={cn("border-[3px] border-[#1A1B1C] p-8", card.className)}
              style={{ background: FILLS[card.bg].background, color: FILLS[card.bg].color }}
            >
              {card.content}
            </article>
          ))}
        </RevealGroup>
      </section>
    );
  }

  return (
    <section ref={ref} className={className} style={{ height: `${(cards.length + 1) * 100}vh` }}>
      <div data-sticky-stage="true" className="sticky top-0 h-screen overflow-hidden bg-[#E3E7EB]">
        <DiagonalGrid progress={scrollYProgress} />
        {cards.map((card, index) => (
          <StackCard
            key={index}
            card={card}
            index={index}
            total={cards.length}
            progress={smooth}
          />
        ))}
      </div>
    </section>
  );
}
