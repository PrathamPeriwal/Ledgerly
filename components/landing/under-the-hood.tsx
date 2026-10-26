"use client";

import { Counter } from "@/components/fx/Counter";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { btnOrange } from "./ui";

function seconds(value: number) {
  return `${value.toFixed(1)}s`;
}

function whole(value: number) {
  return String(Math.round(value));
}

const FACTS = [
  ["NEXT.JS 15 + REACT 19", "App Router, server actions."],
  ["POSTGRES + PRISMA", "Hosted on Supabase."],
  ["CLERK", "Email, password and OAuth sign-in."],
  ["INNGEST", "Recurring transactions and monthly reports run as background jobs."],
  ["GEMINI 3.8 FLASH", "Reads receipts and drafts insights."],
  ["ARCJET", "Bot and abuse protection."],
] as const;

export function UnderTheHood() {
  return (
    <section className="px-4 pb-16 md:px-8 md:pb-24">
      <RevealHeading className="display text-5xl md:text-8xl">UNDER THE HOOD.</RevealHeading>
      <div className="mt-10 grid gap-[3px] border-[3px] border-[#1A1B1C] bg-[#1A1B1C] sm:grid-cols-2 lg:grid-cols-3">
        {FACTS.map(([label, line]) => (
          <div key={label} className="bg-white p-6">
            <p className="label">{label}</p>
            <p className="mt-3 text-lg">{line}</p>
          </div>
        ))}
        <div className="bg-white p-6 sm:col-span-2 lg:col-span-3">
          <p className="label">RESULTS</p>
        </div>
        <div className="bg-white p-6">
          <p className="label">DASHBOARD LOAD</p>
          <p className="mt-3 text-lg">
            <Counter value={6.9} format={seconds} /> to <Counter value={0.7} format={seconds} />
          </p>
        </div>
        <div className="bg-white p-6">
          <p className="label">DB QUERIES PER DASHBOARD</p>
          <p className="mt-3 text-lg">
            <Counter value={13} format={whole} /> to <Counter value={6} format={whole} />
          </p>
        </div>
        <div className="bg-white p-6">
          <p className="label">ACCOUNT PAGE QUERIES</p>
          <p className="mt-3 text-lg">
            <Counter value={9} format={whole} /> to <Counter value={6} format={whole} />
          </p>
        </div>
        <p className="bg-white p-6 text-sm sm:col-span-2 lg:col-span-3">
          Production, demo account, median of 3 runs from one location.
        </p>
        <div className="flex flex-col items-start justify-between gap-6 bg-white p-6 sm:col-span-2 lg:col-span-3 md:flex-row md:items-center">
          <p className="display text-3xl md:text-5xl">READ THE CODE</p>
          <a
            href="https://github.com/PrathamPeriwal/Ledgerly"
            rel="noopener noreferrer"
            data-cursor="OPEN"
            className={btnOrange}
          >
            OPEN ON GITHUB
          </a>
        </div>
      </div>
    </section>
  );
}
