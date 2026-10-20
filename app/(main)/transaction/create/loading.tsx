import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Skeleton className="mx-auto h-10 w-56" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
