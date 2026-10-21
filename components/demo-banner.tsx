"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { TiltedTag } from "@/components/fx/TiltedTag";

export function DemoBanner() {
  const { signOut } = useClerk();

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[#1A1B1C] px-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-white">
      <p>SAMPLE DATA. THIS IS A DEMO ACCOUNT.</p>
      <div className="flex items-center gap-3">
        <TiltedTag>DEMO DATA</TiltedTag>
        <Link
          href="/"
          className="inline-flex min-h-10 items-center underline"
          onClick={(event) => {
            event.preventDefault();
            void signOut({ redirectUrl: "/" });
          }}
        >
          SIGN OUT
        </Link>
      </div>
    </div>
  );
}
