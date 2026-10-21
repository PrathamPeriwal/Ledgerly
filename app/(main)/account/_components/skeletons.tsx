export function AccountSummarySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-28 border-[3px] border-[#1A1B1C]" />
        ))}
      </div>
      <div className="skeleton h-10 w-64 max-w-full border-[3px] border-[#1A1B1C]" />
      <div className="skeleton h-[220px] border-[3px] border-[#1A1B1C] md:h-[280px]" />
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="space-y-2 p-3" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton h-14 border-[3px] border-[#1A1B1C]" />
      ))}
      <div className="skeleton h-10 w-64 max-w-full border-[3px] border-[#1A1B1C]" />
    </div>
  );
}
