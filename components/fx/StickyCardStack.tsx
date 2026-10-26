"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import { DiagonalGrid } from "./DiagonalGrid";
import { RevealGroup } from "./Reveal";
import { sectionHeightVh, stackFrame } from "@/lib/fx/stack-timing";

const INK = "#1A1B1C";
const GRID_DRIFT = 0.65;

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

/** Per-card scroll progress (0..1, second half of the card's slot). 1 when not animating. */
const LocalContext = createContext<MotionValue<number> | null>(null);

export function useStackLocal(): MotionValue<number> {
  const ctx = useContext(LocalContext);
  const done = useMotionValue(1);
  return ctx ?? done;
}

// Final geometry as % of the stage.
const PLACES = [
  { left: 2.5, top: 3, width: 68, height: 74 },
  { left: 24, top: 20, width: 68, height: 72 },
  { left: 10, top: 40, width: 58, height: 56 },
];

function place(index: number) {
  return PLACES[index] ?? { left: 10, top: 10 + (index % 3) * 8, width: 60, height: 60 };
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
  // distance (in own width %) that puts the card fully past the stage's right edge
  const offX = Math.ceil(((100 - box.left) / box.width) * 100) + 4;
  const enter = useTransform(progress, (v) => stackFrame(v, total).cards[index].enter);
  const dim = useTransform(progress, (v) => stackFrame(v, total).cards[index].dim);
  const local = useTransform(progress, (v) => stackFrame(v, total).cards[index].local);
  const x = useTransform(enter, (e) => `${(1 - e) * offX}%`);
  const y = useTransform(enter, (e) => `${(1 - e) * 40}%`);
  const scale = useTransform(dim, (d) => 1 - d * 0.03);
  const overlay = useTransform(dim, (d) => d * 0.35);
  return (
    <m.article
      data-sticky-card="true"
      className={cn("absolute overflow-hidden border-[3px] border-[#1A1B1C] p-5 xl:p-6", card.className)}
      style={{
        left: `${box.left}%`,
        top: `${box.top}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        x,
        y,
        scale,
        zIndex: index + 1,
        background: FILLS[card.bg].background,
        color: FILLS[card.bg].color,
      }}
    >
      <LocalContext.Provider value={local}>{card.content}</LocalContext.Provider>
      <m.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#1A1B1C]"
        style={{ opacity: overlay }}
      />
    </m.article>
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
  const stageRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const raw = useMotionValue(0);
  const smooth = useSpring(raw, { stiffness: 120, damping: 30, mass: 0.4 });
  const range = useMotionValue(0);
  const { scrollY } = useScroll();
  const gridPx = useTransform([smooth, range], ([p, r]) => stackFrame(Number(p), 1).gridOffset * Number(r) * GRID_DRIFT);

  const measure = () => {
    const section = ref.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const pinTop = parseFloat(getComputedStyle(stage).top) || 0;
    const total = section.offsetHeight - stage.offsetHeight;
    range.set(Math.max(total, 0));
    if (total <= 0) return;
    const p = (pinTop - section.getBoundingClientRect().top) / total;
    raw.set(Math.min(1, Math.max(0, p)));
  };
  useMotionValueEvent(scrollY, "change", measure);

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

  useLayoutEffect(() => {
    if (compact) return;
    measure();
    smooth.jump(raw.get());
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  if (cards.length === 0) return null;

  if (compact) {
    return (
      <section className={className} data-sticky-list="true">
        <RevealGroup className="flex flex-col gap-6 px-4 py-10">
          {cards.map((card, index) => (
            <article
              key={index}
              data-sticky-card="true"
              className={cn("border-[3px] border-[#1A1B1C] p-5", card.className)}
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
    <section
      ref={ref}
      data-sticky-section="true"
      className={className}
      style={{ height: `${sectionHeightVh(cards.length)}svh` }}
    >
      <div
        ref={stageRef}
        data-sticky-stage="true"
        className="sticky overflow-clip bg-[#E3E7EB]"
        style={{ top: "var(--nav-h, 64px)", height: "calc(100svh - var(--nav-h, 64px))" }}
      >
        <DiagonalGrid offset={gridPx} />
        {cards.map((card, index) => (
          <StackCard key={index} card={card} index={index} total={cards.length} progress={smooth} />
        ))}
      </div>
    </section>
  );
}
