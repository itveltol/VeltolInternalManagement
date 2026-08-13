import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function FeedLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-24 w-full rounded-card" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
