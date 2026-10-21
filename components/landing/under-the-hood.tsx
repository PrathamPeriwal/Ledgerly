import { RevealHeading } from "@/components/fx/RevealHeading";
import { btnOrange } from "./ui";

const FACTS = [
  ["NEXT.JS 15 + REACT 19", "App Router, server actions."],
  ["POSTGRES + PRISMA", "Hosted on Supabase."],
  ["CLERK", "Email, password and OAuth sign-in."],
  ["INNGEST", "Recurring transactions and monthly reports run as background jobs."],
  ["GEMINI 2.5 FLASH", "Reads receipts and drafts insights."],
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
        <div className="flex flex-col items-start justify-between gap-6 bg-white p-6 sm:col-span-2 lg:col-span-3 md:flex-row md:items-center">
          <p className="display text-3xl md:text-5xl">READ THE CODE</p>
          <a
            href="https://github.com/PrathamPeriwal/Ledgerly"
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
