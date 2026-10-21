import { Reveal } from "@/components/fx/Reveal";
import { getDashboardViewModel } from "@/lib/data/dashboard";
import { AccountGrid } from "./account-grid";
import { BudgetPanel } from "./budget-panel";
import { CashFlow } from "./cash-flow";
import { CategoryBars } from "./category-bars";
import { KpiStrip } from "./kpi-strip";
import { RecentActivity } from "./recent-activity";

export async function DashboardBody() {
  const data = await getDashboardViewModel();
  const defaultAccount = data.accounts.find((account) => account.isDefault) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <KpiStrip
          totalBalance={data.totalBalance}
          spent={data.month.spent}
          income={data.month.income}
          budget={data.budget}
        />
      </Reveal>
      <Reveal delay={0.08}>
        <BudgetPanel budget={data.budget} />
      </Reveal>
      <Reveal delay={0.16}>
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <CashFlow flow={data.flow} />
          <CategoryBars categories={data.month.byCategory} />
        </div>
      </Reveal>
      <Reveal delay={0.24} className="order-2">
        <AccountGrid accounts={data.accounts} />
      </Reveal>
      <Reveal delay={0.32} className="order-1">
        <RecentActivity
          recent={data.recent}
          accounts={data.accounts.map((account) => ({ id: account.id, name: account.name }))}
          defaultAccountId={defaultAccount?.id ?? null}
        />
      </Reveal>
    </div>
  );
}
