"use client";

import { Counter } from "@/components/fx/Counter";
import { useBalance } from "./balance-store";

export function BalanceBadge() {
  const balance = useBalance();
  return (
    <div className="flex h-[132px] w-[132px] flex-col items-center justify-center rounded-full border-[3px] border-[#1A1B1C] bg-[#1A1B1C] text-white lg:h-[180px] lg:w-[180px]">
      <span className="label text-[#FF5F14]">BALANCE</span>
      <div data-testid="balance" className="mt-1 text-base font-bold lg:text-xl">
        <Counter value={balance} />
      </div>
    </div>
  );
}
