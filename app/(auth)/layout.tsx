import Link from "next/link";
import type { ReactNode } from "react";
import { GridBackground } from "@/components/fx/GridBackground";
import { RadialHatch } from "@/components/fx/LineArt";
import { AppClerkProvider } from "@/components/app-clerk-provider";
import { DemoCell } from "./demo-cell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AppClerkProvider>
    <main id="content" className="min-h-screen">
    <div className="grid min-h-screen bg-[#E3E7EB] md:grid-cols-2">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#1A1B1C] p-8 text-white md:flex">
        <GridBackground lines="paper" />
        <Link href="/" className="relative display text-2xl text-white">
          Ledgerly
        </Link>
        <RadialHatch size={280} color="#FFFFFF" className="relative" />
        <div className="relative">
          <h1 className="display text-[clamp(2.75rem,5vw,5.5rem)] text-white">KNOW WHERE IT WENT.</h1>
          <p className="label mt-4">SCAN. REVIEW. TRACK.</p>
        </div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-14 items-center bg-[#1A1B1C] px-4 md:hidden">
          <Link href="/" className="display text-xl text-white">
            Ledgerly
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="flex w-full min-w-0 max-w-md flex-col gap-4">
            {children}
            <DemoCell />
          </div>
        </div>
      </div>
    </div>
    </main>
    </AppClerkProvider>
  );
}
