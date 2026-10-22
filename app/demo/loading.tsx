import { Skeleton } from "@/components/ui/skeleton";
import { LoadingTag } from "@/components/loading-tag";

export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-16">
      <Skeleton className="mx-auto h-10 w-48" />
      <Skeleton className="mx-auto h-24 max-w-md" />
      <LoadingTag />
    </div>
  );
}
