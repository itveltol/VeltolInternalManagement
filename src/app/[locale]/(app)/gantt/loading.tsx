import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

export default function GanttLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <Skeleton className="h-[28rem] rounded-card" />
    </div>
  );
}
