import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm space-y-3 p-5">
      <Skeleton className="h-4 w-24 rounded" />
      <Skeleton className="h-8 w-32 rounded" />
      <Skeleton className="h-3 w-16 rounded" />
    </div>
  );
}
