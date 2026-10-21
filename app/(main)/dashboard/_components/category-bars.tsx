import { EmptyState } from "@/components/empty-state";
import { Amount } from "@/components/fx/Privacy";
import type { DashboardCategory } from "@/lib/types/dashboard";

export function CategoryBars({ categories }: { categories: DashboardCategory[] }) {
  const sorted = [...categories].filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount);
  const head = sorted.slice(0, 6);
  const rest = sorted.slice(6).reduce((sum, row) => sum + row.amount, 0);
  const rows = rest > 0 ? [...head, { category: "OTHER", amount: rest }] : head;
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <section className="min-w-0 border-[3px] border-[#1A1B1C] bg-white p-4 md:p-6">
      <h2 className="label">SPENDING BY CATEGORY</h2>
      {total <= 0 ? (
        <div className="mt-6">
          <EmptyState title="NO EXPENSES THIS MONTH" />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const share = (row.amount / total) * 100;
            return (
              <li key={row.category}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                  <p className="label truncate">{row.category}</p>
                  <Amount value={row.amount} className="text-sm" />
                  <span className="font-num w-10 text-right text-xs">{Math.round(share)}%</span>
                </div>
                <div className="mt-1 h-2 bg-[#E3E7EB]">
                  <div
                    className="h-full"
                    style={{ width: `${share}%`, background: index === 0 ? "#FF5F14" : "#1A1B1C" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
