"use client";

import dynamic from "next/dynamic";
import { HatchFill } from "@/components/fx/LineArt";
import type { AccountFlowPoint } from "@/lib/types/account";

const CashFlowChart = dynamic(
  () => import("../../dashboard/_components/cash-flow-chart").then((mod) => mod.CashFlowChart),
  { ssr: false, loading: () => <div className="skeleton h-full w-full" /> },
);

export function AccountChartPanel({ points, empty }: { points: AccountFlowPoint[]; empty: boolean }) {
  return (
    <section className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-4 md:p-6">
      <h2 className="label">CASH FLOW</h2>
      <div className="mt-4 h-[220px] w-full md:h-[280px]">
        {empty ? (
          <div data-chart-ready="true" className="flex h-full flex-col items-center justify-center gap-3">
            <HatchFill size={96} />
            <p className="label text-center">NO TRANSACTIONS IN THIS RANGE</p>
          </div>
        ) : (
          <CashFlowChart flow={points} />
        )}
      </div>
    </section>
  );
}
