import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-32" />
      <LoadingTag />
    </div>
  );
}
