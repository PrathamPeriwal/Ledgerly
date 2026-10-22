import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <LoadingTag />
    </div>
  );
}
