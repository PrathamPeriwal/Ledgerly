export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="skeleton h-28 border-[3px] border-[#1A1B1C]" />
        ))}
      </div>
      <div className="skeleton h-32 border-[3px] border-[#1A1B1C]" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-[280px] border-[3px] border-[#1A1B1C]" />
        <div className="skeleton h-[280px] border-[3px] border-[#1A1B1C]" />
      </div>
      <div className="skeleton h-72 border-[3px] border-[#1A1B1C]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-40 border-[3px] border-[#1A1B1C]" />
        ))}
      </div>
    </div>
  );
}
