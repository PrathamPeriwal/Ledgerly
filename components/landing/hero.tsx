import Link from "next/link";
import { GridBackground } from "@/components/fx/GridBackground";
import { RevealHeading } from "@/components/fx/RevealHeading";
import { Marquee } from "@/components/fx/Marquee";
import { BalanceBadge } from "./balance-badge";
import { ScanDemo } from "./scan-demo";
import { btnOrange, btnWhite } from "./ui";

const CATEGORIES = [
  "FOOD",
  "HOUSING",
  "SALARY",
  "TRANSPORT",
  "ENTERTAINMENT",
  "GROCERIES",
  "UTILITIES",
  "TRAVEL",
];

export function Hero() {
  return (
    <>
      <section className="relative overflow-hidden">
        <GridBackground />
        <div className="relative">
          <div className="grid border-b-[3px] border-[#1A1B1C] bg-white label sm:grid-cols-3">
            <p className="border-b-[3px] border-[#1A1B1C] px-4 py-3 sm:border-b-0 sm:border-r-[3px]">
              PERSONAL FINANCE LEDGER
            </p>
            <p className="border-b-[3px] border-[#1A1B1C] px-4 py-3 sm:border-b-0 sm:border-r-[3px]">
              SCAN &gt; REVIEW &gt; TRACK
            </p>
            <p className="px-4 py-3">BUILT 2026</p>
          </div>

          <div className="px-4 pb-10 pt-10 md:px-8 md:pt-16">
            <div className="relative">
              <RevealHeading
                as="h1"
                className="display text-[12.5vw] md:text-[14vw]"
              >
                KNOW WHERE IT WENT.
              </RevealHeading>
              <div className="mt-6 md:absolute md:bottom-0 md:right-[3%] md:mt-0">
                <BalanceBadge />
              </div>
            </div>
            <p className="relative z-10 mt-8 max-w-2xl bg-[#E3E7EB] px-2 py-1 text-lg md:text-xl">
              Ledgerly reads your receipts, files them under the right category and shows what is
              left in your budget. You review everything before it is saved.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/sign-in" data-cursor="GO" className={btnOrange}>
                TRY THE DEMO
              </Link>
              <a href="#how" className={btnWhite}>
                SEE HOW IT WORKS
              </a>
            </div>
            <div className="mt-12 md:mt-16">
              <ScanDemo />
            </div>
          </div>
        </div>
      </section>
      <Marquee
        items={CATEGORIES}
        separator="/"
        className="border-y-[3px] border-[#1A1B1C]"
      />
    </>
  );
}
