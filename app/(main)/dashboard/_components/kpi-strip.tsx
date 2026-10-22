import type { ReactNode } from "react";
import { Amount } from "@/components/fx/Privacy";
import type { DashboardBudget } from "@/lib/types/dashboard";

const figure = "block min-w-0 break-words text-lg font-bold leading-tight tracking-tight sm:text-xl lg:text-2xl";

function Figure({ children }: { children: ReactNode }) {
  return <div className="mt-3 min-w-0">{children}</div>;
}

export function KpiStrip({
  totalBalance,
  spent,
  income,
  budget,
}: {
  totalBalance: number;
  spent: number;
  income: number;
  budget: DashboardBudget | null;
}) {
  let safe: ReactNode;
  if (!budget) {
    safe = <p className="display text-2xl sm:text-4xl">NO BUDGET</p>;
  } else if (budget.spent > budget.amount) {
    safe = (
      <p className="display flex items-center gap-2 text-2xl text-[#1A1B1C] sm:text-4xl">
        <span aria-hidden className="inline-block h-3 w-3 shrink-0 bg-[#FF5F14]" />
        OVER BUDGET
      </p>
    );
  } else {
    safe = <Amount value={budget.safePerDay} className={figure} />;
  }

  const cells = [
    { label: "TOTAL BALANCE", value: <Amount value={totalBalance} className={figure} /> },
    { label: "SPENT THIS MONTH", value: <Amount value={spent} className={figure} /> },
    { label: "SAFE TO SPEND / DAY", value: safe },
    { label: "INCOME THIS MONTH", value: <Amount value={income} className={figure} /> },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.label}
          data-testid="kpi"
          className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-3 sm:p-4"
        >
          <p className="label text-muted-foreground">{cell.label}</p>
          <Figure>{cell.value}</Figure>
        </div>
      ))}
    </div>
  );
}
