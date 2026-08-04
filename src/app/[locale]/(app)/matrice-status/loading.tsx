import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function MatriceStatusLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <Skeleton className="h-24 rounded-card" />
      <Skeleton className="h-[28rem] rounded-card" />
    </div>
  );
}
