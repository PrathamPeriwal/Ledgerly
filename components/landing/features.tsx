import type { ReactNode } from "react";
import { WipeReveal } from "@/components/fx/WipeReveal";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { RadialHatch, ContourCurves, Spiral, HatchFill } from "@/components/fx/LineArt";
import { Amount } from "@/components/fx/Privacy";

function Cell({ title, text, art, children, className }: {
  title: string;
  text: string;
  art?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-white ${className ?? ""}`}>
      <WipeReveal className="h-full">
        <div className="relative flex h-full min-h-[320px] flex-col p-6">
          {art}
          <div className="relative mt-auto pt-8">
            <h3 className="display text-3xl md:text-4xl">{title}</h3>
            <p className="mt-3 max-w-md text-base">{text}</p>
            {children}
          </div>
        </div>
      </WipeReveal>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 px-4 py-16 md:px-8 md:py-24">
      <RevealHeading className="display text-5xl md:text-8xl">FOUR TOOLS. ONE LEDGER.</RevealHeading>
      <div className="mt-10 grid gap-[3px] border-[3px] border-[#1A1B1C] bg-[#1A1B1C] md:grid-cols-2">
        <Cell
          title="RECEIPT SCANNING"
          text="Photo in, transaction out. Gemini reads the receipt and you confirm it."
          art={<RadialHatch size={112} />}
        />
        <Cell
          title="BUDGET WITH PACE"
          text="One monthly budget across all accounts, with a marker for where you should be today."
          art={<ContourCurves size={112} />}
        />
        <Cell
          title="RECURRING, HANDLED"
          text="Rent, salary and subscriptions post themselves on schedule."
          art={<Spiral size={112} />}
        />
        <Cell
          title="PRIVACY MODE"
          text="Hide every amount with one key. Hover to reveal."
          art={
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <HatchFill size={900} color="#C9CED3" />
            </div>
          }
        >
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {[1250, -42.18, 3200].map((v) => (
              <span key={v} className="border-[3px] border-[#1A1B1C] bg-white px-3 py-2 text-lg font-bold">
                <Amount value={v} />
              </span>
            ))}
            <span className="label border-[3px] border-[#1A1B1C] bg-[#FF5F14] px-3 py-2">PRESS H</span>
          </div>
        </Cell>
      </div>
    </section>
  );
}
