import { Amount } from "@/components/fx/Privacy";
import { RevealGroup } from "@/components/fx/Reveal";
import { getAccountSummary } from "@/lib/data/account";
import type { AccountParams } from "@/lib/types/account";
import { AccountChartPanel } from "./chart-panel";
import { RangeTabs } from "./filters";

const figure = "text-xl font-bold leading-none tracking-tight sm:text-2xl lg:text-[2rem]";

export async function AccountSummary({
  id,
  balance,
  range,
}: {
  id: string;
  balance: number;
  range: AccountParams["range"];
}) {
  const summary = await getAccountSummary(id, range);
  const cells = [
    { label: "BALANCE", value: <Amount value={balance} className={figure} /> },
    { label: "INCOME", value: <Amount value={summary.income} className={figure} /> },
    { label: "EXPENSES", value: <Amount value={summary.expense} className={figure} /> },
    {
      label: "NET",
      value: (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0"
            style={{ background: summary.net < 0 ? "#FF5F14" : "#1A1B1C" }}
          />
          <Amount value={summary.net} sign className={figure} />
        </span>
      ),
    },
  ];

  return (
    <RevealGroup className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cells.map((cell) => (
          <div key={cell.label} data-testid="kpi" className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-3 sm:p-4">
            <p className="label text-muted-foreground">{cell.label}</p>
            <div className="mt-3 min-w-0">{cell.value}</div>
          </div>
        ))}
      </div>
      <RangeTabs />
      <AccountChartPanel points={summary.series} empty={summary.count === 0} />
    </RevealGroup>
  );
}
