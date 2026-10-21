import { AccountSummarySkeleton, TransactionsSkeleton } from "../_components/skeletons";

export default function Loading() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="skeleton h-24 border-[3px] border-[#1A1B1C]" />
      <AccountSummarySkeleton />
      <TransactionsSkeleton />
    </div>
  );
}
