import { formatCurrency } from "@/lib/format";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { StickyCardStack, type StickyCard } from "@/components/fx/StickyCardStack";
import { RadialHatch } from "@/components/fx/LineArt";
import { TiltedTag } from "@/components/fx/TiltedTag";
import { BudgetMeter } from "./meter";
import "./landing.css";

const title = "display text-5xl md:text-6xl";

function ScanCard() {
  return (
    <div className="grid h-full content-start items-start gap-5 md:grid-cols-2">
      <div>
        <h3 className={title}>SCAN</h3>
        <p className="mt-3 text-lg font-semibold">Take a photo of a receipt. Ledgerly reads it.</p>
      </div>
      <div className="relative mx-auto h-40 w-full max-w-[220px] overflow-hidden border-[3px] border-[#1A1B1C] bg-white p-3 md:h-48" aria-hidden>
        <RadialHatch size={90} className="absolute -right-6 -top-6" />
        <div className="h-3 w-2/3 bg-[#1A1B1C]" />
        <div className="mt-4 space-y-2">
          {[80, 60, 70, 50].map((w, i) => (
            <div key={i} className="h-2 bg-[#1A1B1C]" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="landing-scanline" />
      </div>
    </div>
  );
}

function ReviewCard() {
  return (
    <div className="grid h-full content-start items-start gap-5 md:grid-cols-2">
      <div>
        <h3 className={title}>REVIEW</h3>
        <p className="mt-3 text-lg font-semibold">Nothing is saved until you confirm.</p>
      </div>
      <div className="space-y-2 text-[#1A1B1C]" aria-hidden>
        {[
          ["MERCHANT", "Corner Market"],
          ["AMOUNT", formatCurrency(1054.5)],
          ["CATEGORY", "Groceries"],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 border-[3px] border-white bg-[#1A1B1C] px-3 py-2 text-white">
            <span className="label">{k}</span>
            <span className="flex items-center gap-2">
              <span className={k === "CATEGORY" ? "border-2 border-white px-2 text-sm font-bold" : "font-num font-bold"}>{v}</span>
              <TiltedTag className="hidden sm:inline-block">AI FILLED</TiltedTag>
            </span>
          </div>
        ))}
        <div className="label inline-block border-[3px] border-white bg-[#FF5F14] px-4 py-3">CONFIRM</div>
      </div>
    </div>
  );
}

function TrackCard() {
  const bars = [40, 65, 30, 80, 55, 90, 45];
  return (
    <div className="grid h-full content-start items-start gap-5 md:grid-cols-2">
      <div>
        <h3 className={title}>TRACK</h3>
        <p className="mt-3 text-lg font-semibold">Budgets, bills and balances in one place.</p>
      </div>
      <div className="space-y-4" aria-hidden>
        <div className="flex h-28 items-end gap-2 border-b-[3px] border-[#1A1B1C]">
          {bars.map((h, i) => (
            <div key={i} className={`flex-1 ${i % 3 === 2 ? "bg-[#FF5F14]" : "bg-[#1A1B1C]"}`} style={{ height: `${h}%` }} />
          ))}
        </div>
        <div>
          <p className="label mb-2">BUDGET 82%</p>
          <BudgetMeter spent={82} budget={100} pace={64} />
        </div>
      </div>
    </div>
  );
}

const CARDS: StickyCard[] = [
  { bg: "orange", content: <ScanCard /> },
  { bg: "ink", content: <ReviewCard /> },
  { bg: "white", content: <TrackCard /> },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-t-[3px] border-[#1A1B1C]">
      <div className="px-4 pt-16 md:px-8 md:pt-24">
        <RevealHeading className="display text-5xl md:text-8xl">THREE STEPS.</RevealHeading>
      </div>
      <StickyCardStack cards={CARDS} />
    </section>
  );
}
