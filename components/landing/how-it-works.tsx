"use client";

import type { ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { formatCurrency } from "@/lib/format";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { StickyCardStack, useStackLocal, type StickyCard } from "@/components/fx/StickyCardStack";

const title = "display text-5xl";
const label = "text-xs font-semibold uppercase tracking-[0.06em]";
const amount = formatCurrency(1054.5);

function useStep(local: MotionValue<number>, from: number, to: number) {
  return useTransform(local, [from, to], [0, 1], { clamp: true });
}

function Tag({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.span
      style={{ opacity }}
      className="inline-block -rotate-[4deg] border-2 border-[#1A1B1C] bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-[#1A1B1C]"
    >
      AI FILLED
    </motion.span>
  );
}

function Header({ name, copy }: { name: string; copy: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <h3 className={title}>{name}</h3>
      <p className="max-w-sm text-sm font-semibold md:text-right">{copy}</p>
    </div>
  );
}

function Cell({ children }: { children: ReactNode }) {
  return <div className={`${label} border-[3px] border-current px-3 py-2 text-center md:-ml-[3px] md:first:ml-0`}>{children}</div>;
}

function FilledRow({
  name,
  step,
  children,
}: {
  name: string;
  step: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-2 border-[#1A1B1C] px-3 py-2">
      <span className={label}>{name}</span>
      <span className="flex items-center gap-2">
        <motion.span style={{ opacity: step }} className="text-sm font-bold">
          {children}
        </motion.span>
        <Tag opacity={step} />
      </span>
    </div>
  );
}

function AddCard() {
  const local = useStackLocal();
  const scanTop = useTransform(local, (v) => `${v * 100}%`);
  const s1 = useStep(local, 0.3, 0.4);
  const s2 = useStep(local, 0.55, 0.65);
  const s3 = useStep(local, 0.8, 0.9);
  return (
    <div className="flex h-full flex-col gap-3">
      <Header name="ADD" copy="Scan a receipt or type it in. Either way it lands in the same ledger." />
      <div className="flex w-fit border-[3px] border-[#1A1B1C]" aria-hidden>
        <span className={`${label} bg-[#1A1B1C] px-4 py-1.5 text-white`}>SCAN</span>
        <span className={`${label} bg-white px-4 py-1.5`}>MANUAL</span>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2" aria-hidden>
        <div className="relative min-h-[130px] overflow-hidden border-[3px] border-[#1A1B1C] bg-white p-3 text-[#1A1B1C]">
          <p className={label}>CORNER MARKET</p>
          <div className="mt-3 space-y-2">
            {[80, 60, 70].map((w, i) => (
              <div key={i} className="h-2 bg-[#1A1B1C]" style={{ width: `${w}%` }} />
            ))}
          </div>
          <p className="font-num mt-3 text-sm font-bold">TOTAL {amount}</p>
          <motion.div className="absolute left-0 right-0 h-1 bg-[#FF5F14]" style={{ top: scanTop }} />
        </div>
        <div className="space-y-2 border-[3px] border-[#1A1B1C] bg-white p-3 text-[#1A1B1C]">
          <FilledRow name="AMOUNT" step={s1}>
            <span className="font-num">{amount}</span>
          </FilledRow>
          <FilledRow name="CATEGORY" step={s2}>
            <span className="border-2 border-[#1A1B1C] px-2">GROCERIES</span>
          </FilledRow>
          <FilledRow name="DATE" step={s3}>
            <span className="font-num">22 OCT</span>
          </FilledRow>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-3 md:gap-0" aria-hidden>
        <Cell>MULTIPLE ACCOUNTS</Cell>
        <Cell>RECURRING RULES</Cell>
        <Cell>RECEIPT SCAN</Cell>
      </div>
    </div>
  );
}

function LedgerRow({
  date,
  name,
  value,
  expense,
  collapse,
}: {
  date: string;
  name: string;
  value: string;
  expense: boolean;
  collapse?: MotionValue<number>;
}) {
  const fallback = useTransform(useStackLocal(), () => 1);
  const k = collapse ?? fallback;
  const height = useTransform(k, [0, 1], [36, 0]);
  const opacity = useTransform(k, [0, 1], [1, 0]);
  return (
    <motion.div style={{ height, opacity }} className="overflow-hidden">
      <div className="flex h-9 items-center gap-2 border-b-2 border-[#1A1B1C] text-sm">
        <span className="font-num w-14 shrink-0 text-xs font-semibold">{date}</span>
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="font-num font-bold">{value}</span>
        <span className={`h-3 w-3 shrink-0 border-2 border-[#1A1B1C] ${expense ? "bg-[#FF5F14]" : "bg-[#1A1B1C]"}`} />
      </div>
    </motion.div>
  );
}

function ReviewCard() {
  const local = useStackLocal();
  const rows = [
    useStep(local, 0.05, 0.15),
    useStep(local, 0.2, 0.3),
    useStep(local, 0.35, 0.45),
  ];
  const hideA = useStep(local, 0.25, 0.55);
  const hideB = useStep(local, 0.5, 0.8);
  const press = useTransform(local, [0.8, 0.85, 0.92, 1], [1, 0.93, 1, 1]);
  const items: [string, ReactNode][] = [
    ["MERCHANT", "Corner Market"],
    ["AMOUNT", <span key="a" className="font-num">{amount}</span>],
    ["CATEGORY", <span key="c" className="border-2 border-white px-2">GROCERIES</span>],
  ];
  return (
    <div className="flex h-full flex-col gap-3">
      <Header name="REVIEW" copy="Nothing is saved until you confirm." />
      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2" aria-hidden>
        <div className="space-y-2">
          {items.map(([name, value], i) => (
            <div key={name} className="flex items-center justify-between gap-2 border-2 border-white px-3 py-2">
              <span className={label}>{name}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold">{value}</span>
                {i > 0 ? <Tag opacity={rows[i]} /> : null}
              </span>
            </div>
          ))}
          <motion.div
            style={{ scale: press }}
            className={`${label} inline-block origin-left border-[3px] border-white bg-[#FF5F14] px-5 py-2.5 text-[#1A1B1C]`}
          >
            CONFIRM
          </motion.div>
        </div>
        <div className="border-[3px] border-white bg-white p-3 text-[#1A1B1C]">
          <p className={label}>FIND IT LATER</p>
          <div className="mt-2 flex gap-2">
            <span className={`${label} border-2 border-[#1A1B1C] px-2 py-0.5`}>SEARCH: FOOD</span>
            <span className={`${label} border-2 border-[#1A1B1C] bg-[#1A1B1C] px-2 py-0.5 text-white`}>EXPENSE</span>
          </div>
          <div className="mt-2">
            <LedgerRow date="22 OCT" name="Corner Market" value={amount} expense />
            <LedgerRow date="20 OCT" name="Salary" value={formatCurrency(80000)} expense={false} collapse={hideA} />
            <LedgerRow date="18 OCT" name="Metro card" value={formatCurrency(500)} expense={false} collapse={hideB} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-0" aria-hidden>
        <Cell>SEARCH</Cell>
        <Cell>FILTER</Cell>
        <Cell>EDIT</Cell>
        <Cell>BULK DELETE</Cell>
      </div>
    </div>
  );
}

function Bar({ local, index, value }: { local: MotionValue<number>; index: number; value: number }) {
  const height = useTransform(local, [index * 0.07, 0.5 + index * 0.07], ["0%", `${value}%`], { clamp: true });
  return <motion.div className={`flex-1 ${index % 3 === 2 ? "bg-[#FF5F14]" : "bg-[#1A1B1C]"}`} style={{ height }} />;
}

function TrackCard() {
  const local = useStackLocal();
  const bars = [40, 65, 30, 80, 55, 90, 45];
  const width = useTransform(local, [0.1, 0.8], ["0%", "82%"], { clamp: true });
  const pct = useTransform(local, [0.1, 0.8], [0, 82], { clamp: true });
  const text = useTransform(pct, (v) => `${Math.round(v)}%`);
  const chips = ["MONTHLY BUDGET WITH PACE", "BILLS POST THEMSELVES", "MONTHLY REPORT BY EMAIL"];
  return (
    <div className="flex h-full flex-col gap-3">
      <Header name="TRACK" copy="Budgets, bills and balances in one place." />
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2" aria-hidden>
        <div className="flex min-h-[72px] items-end gap-2 border-b-[3px] border-[#1A1B1C]">
          {bars.map((v, i) => (
            <Bar key={i} local={local} index={i} value={v} />
          ))}
        </div>
        <div className="self-center">
          <p className={`${label} mb-2 flex justify-between`}>
            <span>BUDGET USED</span>
            <motion.span className="font-num">{text}</motion.span>
          </p>
          <div className="relative h-5 bg-[#1A1B1C]">
            <motion.div className="h-full bg-[#FF5F14]" style={{ width }} />
            <div className="absolute -bottom-1 -top-1 left-[64%] w-[3px] bg-white outline outline-1 outline-[#1A1B1C]" />
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.06em]" style={{ marginLeft: "64%" }}>PACE</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" aria-hidden>
        {chips.map((c) => (
          <span key={c} className={`${label} border-[3px] border-[#1A1B1C] px-2 py-1`}>{c}</span>
        ))}
        <span className={`${label} bg-[#1A1B1C] px-2 py-1 text-white`}>PRIVACY MODE · PRESS H</span>
      </div>
    </div>
  );
}

const CARDS: StickyCard[] = [
  { bg: "orange", content: <AddCard /> },
  { bg: "ink", content: <ReviewCard /> },
  { bg: "white", content: <TrackCard /> },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-t-[3px] border-[#1A1B1C]">
      <div className="px-4 pb-8 pt-16 md:px-8 md:pt-24">
        <RevealHeading className="display text-5xl md:text-8xl">HOW IT WORKS.</RevealHeading>
        <p className="mt-4 text-base font-normal">Scan it or type it. Review it. Track it.</p>
      </div>
      <StickyCardStack cards={CARDS} />
    </section>
  );
}
