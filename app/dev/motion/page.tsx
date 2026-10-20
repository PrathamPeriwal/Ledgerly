import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Counter } from "@/components/fx/Counter";
import { GridBackground } from "@/components/fx/GridBackground";
import { ContourCurves, HatchFill, RadialHatch, Spiral } from "@/components/fx/LineArt";
import { Marquee } from "@/components/fx/Marquee";
import { Amount, PrivacyToggle } from "@/components/fx/Privacy";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { StickyCardStack } from "@/components/fx/StickyCardStack";
import { TiltedTag } from "@/components/fx/TiltedTag";
import { WipeReveal } from "@/components/fx/WipeReveal";

function ArtCard({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <WipeReveal delay={delay}>
      <div className="flex items-center justify-center border-[3px] border-[#1A1B1C] bg-white p-4">
        {children}
      </div>
    </WipeReveal>
  );
}

function StackCopy({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col justify-between gap-8">
      <p className="display text-5xl md:text-6xl">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed">{body}</p>
    </div>
  );
}

export default function DevMotionPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
      <div className="overflow-x-clip bg-[#E3E7EB] text-[#1A1B1C]">
        <div className="pt-16">
          <Marquee
            items={["SCAN", "REVIEW", "TRACK", "HIDE", "SHOW", "LEDGERLY"]}
            speed={1}
            separator="/"
          />
        </div>

        <section className="relative h-[70vh] overflow-hidden">
          <GridBackground />
          <div className="relative px-6 pt-16">
            <TiltedTag>Phase F2</TiltedTag>
          </div>
        </section>

        <section className="relative px-6 py-24">
          <GridBackground variant="square" />
          <RevealHeading className="display relative text-5xl md:text-7xl">
            Effects in motion
          </RevealHeading>
        </section>

        <section className="grid grid-cols-2 gap-4 px-6">
          <ArtCard delay={0}>
            <RadialHatch />
          </ArtCard>
          <ArtCard delay={0.08}>
            <ContourCurves />
          </ArtCard>
          <ArtCard delay={0.16}>
            <Spiral />
          </ArtCard>
          <ArtCard delay={0.24}>
            <HatchFill />
          </ArtCard>
        </section>

        <section className="flex flex-wrap gap-10 px-6 py-20 text-3xl">
          <Counter value={12840.5} />
          <Counter value={4200} />
          <Counter value={86.4} />
        </section>

        <section className="flex flex-wrap items-center gap-6 px-6 pb-16 text-2xl">
          <Amount value={12840.5} sign />
          <Amount value={-86.4} />
          <PrivacyToggle />
        </section>

        <section className="grid gap-4 px-6 pb-24 md:grid-cols-2">
          <div data-cursor="OPEN" className="border-[3px] border-[#1A1B1C] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Open ledger</p>
            <p className="mt-3 text-sm">A sample card for the cursor ring.</p>
          </div>
          <div data-cursor="OPEN" className="border-[3px] border-[#1A1B1C] bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Open account</p>
            <p className="mt-3 text-sm">A second sample card for the cursor ring.</p>
          </div>
        </section>

        <StickyCardStack
          cards={[
            {
              bg: "orange",
              content: (
                <StackCopy title="SCAN" body="Receipts land as entries. Placeholder for the scan panel." />
              ),
            },
            {
              bg: "ink",
              content: (
                <StackCopy title="REVIEW" body="Check the week before it closes. Placeholder for review." />
              ),
            },
            {
              bg: "white",
              content: (
                <StackCopy title="TRACK" body="Balances stay in one stack. Placeholder for tracking." />
              ),
            },
          ]}
        />
      </div>
  );
}
