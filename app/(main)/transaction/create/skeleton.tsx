export function TransactionFormSkeleton() {
  return (
    <div className="min-w-0" aria-hidden>
      <div className="border-b-[3px] border-[#1A1B1C] py-6">
        <div className="skeleton h-4 w-28" />
        <div className="skeleton mt-3 h-14 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 pt-6 lg:grid-cols-2">
        <div className="order-2 skeleton h-[36rem] border-[3px] border-[#1A1B1C] lg:order-1" />
        <div className="order-1 skeleton h-16 border-[3px] border-[#1A1B1C] lg:order-2 lg:h-[36rem]" />
      </div>
    </div>
  );
}
