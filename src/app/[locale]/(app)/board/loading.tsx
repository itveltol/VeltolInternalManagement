import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function BoardLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-24 w-full rounded-card" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
