import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-8">
      <Skeleton className="h-16 w-2/3" />
      <Skeleton className="h-40" />
      <LoadingTag />
    </div>
  );
}
