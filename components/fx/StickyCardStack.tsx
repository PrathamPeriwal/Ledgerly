"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";
import { DiagonalGrid } from "./DiagonalGrid";
import { RevealGroup } from "./Reveal";
import { dimAmount, enterAmount, gridAmount, sectionHeightVh } from "@/lib/fx/stack-timing";

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
  { width: "72%", height: "78%", left: "3%", top: "2%" },
  { width: "66%", height: "64%", left: "20%", top: "28%" },
  { width: "60%", height: "46%", left: "34%", top: "50%" },
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
  const x = useTransform(progress, (value) => `${(1 - enterAmount(value, index, total)) * 28}vw`);
  const y = useTransform(progress, (value) => `${(1 - enterAmount(value, index, total)) * 36}vh`);
  const scale = useTransform(progress, (value) => {
    const entered = enterAmount(value, index, total);
    const dimmed = dimAmount(value, index, total);
    return (0.94 + entered * 0.06) * (1 - dimmed * 0.06);
  });
  const filter = useTransform(progress, (value) => `brightness(${1 - dimAmount(value, index, total) * 0.28})`);
  return (
    <motion.article
      data-sticky-card="true"
      className={cn("absolute overflow-hidden border-[3px] border-[#1A1B1C] p-6 md:p-8", card.className)}
      style={{
        ...box,
        x,
        y,
        scale,
        filter,
        opacity: 1,
        zIndex: index + 1,
        background: FILLS[card.bg].background,
        color: FILLS[card.bg].color,
      }}
    >
      {card.content}
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
  const grid = useTransform(scrollYProgress, (value) => gridAmount(value, cards.length));

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
    <section ref={ref} className={className} style={{ height: `${sectionHeightVh(cards.length)}vh` }}>
      <div data-sticky-stage="true" className="sticky top-0 h-screen overflow-hidden bg-[#E3E7EB]">
        <DiagonalGrid progress={grid} />
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
