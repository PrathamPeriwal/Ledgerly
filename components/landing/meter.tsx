export function BudgetMeter({
  spent,
  budget,
  pace,
}: {
  spent: number;
  budget: number;
  pace: number;
}) {
  const pct = Math.min(100, (spent / budget) * 100);
  return (
    <div className="relative h-5 w-full bg-[#1A1B1C]" role="img" aria-label={`Budget used: ${Math.round(pct)}%`}>
      <div
        className="h-full bg-[#FF5F14] transition-[width] duration-700 motion-reduce:transition-none"
        style={{ width: `${pct}%` }}
      />
      <div
        className="absolute -top-1 -bottom-1 w-[3px] bg-white outline outline-1 outline-[#1A1B1C]"
        style={{ left: `${pace}%` }}
      />
    </div>
  );
}
