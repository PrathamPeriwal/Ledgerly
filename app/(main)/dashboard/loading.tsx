import { DashboardSkeleton } from "./_components/dashboard-skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <>
      <DashboardSkeleton />
      <LoadingTag />
    </>
  );
}
