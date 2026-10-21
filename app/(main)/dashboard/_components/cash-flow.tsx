"use client";

import dynamic from "next/dynamic";
import type { DashboardFlowPoint } from "@/lib/types/dashboard";

const CashFlowChart = dynamic(
  () => import("./cash-flow-chart").then((mod) => mod.CashFlowChart),
  {
    ssr: false,
    loading: () => <div className="skeleton min-h-[220px] w-full" />,
  },
);

export function CashFlow({ flow }: { flow: DashboardFlowPoint[] }) {
  return (
    <section className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-4 md:p-6">
      <h2 className="label">CASH FLOW</h2>
      <div className="mt-4 h-[220px] min-h-[220px] w-full md:h-[280px]">
        <CashFlowChart flow={flow} />
      </div>
    </section>
  );
}
