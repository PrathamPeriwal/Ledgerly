"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Amount } from "@/components/fx/Privacy";
import { TiltedTag } from "@/components/fx/TiltedTag";
import { formatCurrency } from "@/lib/format";
import { useReducedMotionSafe } from "@/components/fx/reduced";
import { BudgetMeter } from "./meter";
import { setBalance, START_BALANCE } from "./balance-store";
import { btnOrange } from "./ui";

const BUDGET = 30000;
const START_SPENT = 16000;
const PACE = 55;
const DATE = "OCT 21, 2026";

const SAMPLES = [
  { merchant: "Corner Market", amount: 1054.5, category: "Groceries", bars: [70, 55, 62, 48] },
  { merchant: "Metro Transit", amount: 462.5, category: "Transport", bars: [58, 40, 66, 52] },
  { merchant: "Blue Door Cafe", amount: 243.75, category: "Dining", bars: [64, 72, 45, 56] },
] as const;

type Phase = "idle" | "scanning" | "filling" | "ready" | "saved";
type Row = { id: number; date: string; merchant: string; category: string; amount: number; fresh?: boolean };

const SEED: Row[] = [
  { id: -3, date: "OCT 18", merchant: "Greenline Utilities", category: "Utilities", amount: -2410 },
  { id: -2, date: "OCT 15", merchant: "Payroll", category: "Salary", amount: 80000 },
  { id: -1, date: "OCT 12", merchant: "City Pharmacy", category: "Health", amount: -590 },
];

const STATUS: Record<Phase, string> = {
  idle: "Press the button to scan a sample receipt.",
  scanning: "Scanning receipt...",
  filling: "Reading fields...",
  ready: "Check the fields, then confirm. Nothing is saved yet.",
  saved: "Saved to your ledger.",
};

export function ScanDemo() {
  const reduced = useReducedMotionSafe();
  const [phase, setPhase] = useState<Phase>("idle");
  const [cur, setCur] = useState(0);
  const [chars, setChars] = useState(0);
  const [rows, setRows] = useState<Row[]>(SEED);
  const [spent, setSpent] = useState(START_SPENT);
  const [balance, setLocalBalance] = useState(START_BALANCE);
  const [count, setCount] = useState(0);
  const nextId = useRef(1);

  const sample = SAMPLES[cur];
  const values = [sample.merchant, DATE, formatCurrency(sample.amount), sample.category];
  const labels = ["MERCHANT", "DATE", "AMOUNT", "CATEGORY"];
  const slots = values.map((v) => v.length + 4);
  const total = slots.reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (phase !== "scanning") return;
    const t = setTimeout(() => setPhase("filling"), 1200);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "filling") return;
    const t = setInterval(() => setChars((c) => c + 1), 35);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase === "filling" && chars >= total) setPhase("ready");
  }, [phase, chars, total]);

  function scan() {
    const next = phase === "saved" ? (cur + 1) % SAMPLES.length : cur;
    setCur(next);
    if (reduced) {
      setChars(9999);
      setPhase("ready");
    } else {
      setChars(0);
      setPhase("scanning");
    }
  }

  function confirm() {
    const row: Row = {
      id: nextId.current++,
      date: "OCT 21",
      merchant: sample.merchant,
      category: sample.category,
      amount: -sample.amount,
      fresh: true,
    };
    const nextBalance = Math.round((balance - sample.amount) * 100) / 100;
    setRows((r) => [row, ...r.map((x) => ({ ...x, fresh: false }))].slice(0, 5));
    setSpent((s) => s + sample.amount);
    setLocalBalance(nextBalance);
    setBalance(nextBalance);
    setCount((c) => c + 1);
    setPhase("saved");
  }

  let offset = 0;
  const fields = values.map((value, i) => {
    const typed = Math.max(0, Math.min(value.length, chars - offset));
    const done = typed >= value.length && phase !== "idle" && phase !== "scanning";
    offset += slots[i];
    return { label: labels[i], text: value.slice(0, typed), done };
  });
  const showFields = phase !== "idle" && phase !== "scanning";
  const busy = phase === "scanning" || phase === "filling" || phase === "ready";

  return (
    <div className="grid border-[3px] border-[#1A1B1C] bg-white md:grid-cols-2">
      <div className="border-b-[3px] border-[#1A1B1C] p-4 md:border-b-0 md:border-r-[3px] md:p-6">
        <div className="relative mx-auto max-w-sm overflow-hidden border-[3px] border-[#1A1B1C] bg-white p-5">
          <p className="display text-2xl">{sample.merchant}</p>
          <div className="mt-1 h-[2px] bg-[#1A1B1C]" />
          <div className="mt-4 space-y-3" aria-hidden>
            {sample.bars.map((w, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="h-2 bg-[#1A1B1C]" style={{ width: `${w}%` }} />
                <div className="h-2 w-10 bg-[#1A1B1C]" />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t-[3px] border-dashed border-[#1A1B1C] pt-3">
            <span className="label">TOTAL</span>
            <span className="font-num text-xl font-bold">{formatCurrency(sample.amount)}</span>
          </div>
          {phase === "scanning" && !reduced ? (
            <motion.div
              aria-hidden
              className="absolute left-0 right-0 h-1 bg-[#FF5F14]"
              initial={{ top: 0 }}
              animate={{ top: "calc(100% - 4px)" }}
              transition={{ duration: 1.2, ease: "linear" }}
            />
          ) : null}
        </div>
        <div className="mt-6 flex justify-center">
          {phase === "ready" ? (
            <button type="button" onClick={confirm} data-cursor="OK" className={btnOrange}>
              CONFIRM
            </button>
          ) : (
            <button
              type="button"
              onClick={scan}
              disabled={busy}
              data-cursor="SCAN"
              className={`${btnOrange} disabled:opacity-100 disabled:hover:bg-[#FF5F14] disabled:hover:text-[#1A1B1C]`}
            >
              {count > 0 ? "SCAN ANOTHER" : "SCAN SAMPLE RECEIPT"}
            </button>
          )}
        </div>
        <p aria-live="polite" className="label mt-4 min-h-[2.5em] text-center">
          {STATUS[phase]}
        </p>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-1 border-b-[3px] border-[#1A1B1C] sm:grid-cols-2">
          {fields.map((f, i) => (
            <div
              key={f.label}
              className={`min-h-[76px] border-[#1A1B1C] p-3 ${i < 2 ? "border-b-[3px]" : ""} ${i % 2 === 0 ? "sm:border-r-[3px]" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="label">{f.label}</span>
                {f.done ? <TiltedTag>AI FILLED</TiltedTag> : null}
              </div>
              <p className="mt-1 min-h-[1.75rem] font-num text-lg font-bold">
                {showFields ? f.text : "-"}
              </p>
            </div>
          ))}
        </div>
        <div className="flex-1 p-3 md:p-4">
          <p className="label mb-2">LEDGER</p>
          <ul className="border-[3px] border-[#1A1B1C]">
            {rows.map((r) => (
              <motion.li
                key={r.id}
                data-testid="ledger-row"
                initial={r.fresh && !reduced ? { height: 0, opacity: 0 } : false}
                animate={{ height: "auto", opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="overflow-hidden border-b-2 border-[#1A1B1C] last:border-b-0"
              >
                <div className="grid grid-cols-[auto_minmax(0,1.4fr)_minmax(0,0.9fr)_auto] items-center gap-x-3 px-3 py-2 text-sm">
                  <span className="font-num text-xs">{r.date}</span>
                  <span className="truncate font-semibold">{r.merchant}</span>
                  <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-[#5B6068]">
                    {r.category}
                  </span>
                  <Amount value={r.amount} />
                </div>
              </motion.li>
            ))}
          </ul>
          <div className="mt-4">
            <div className="label mb-2 flex justify-between">
              <span>BUDGET</span>
              <span className="font-num">
                {formatCurrency(spent)} / {formatCurrency(BUDGET)}
              </span>
            </div>
            <BudgetMeter spent={spent} budget={BUDGET} pace={PACE} />
          </div>
        </div>
      </div>
    </div>
  );
}
