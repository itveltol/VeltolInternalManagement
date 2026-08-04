import { PageHeaderSkeleton } from "@/shared/components/layout/PageHeaderSkeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

function KpiTileSkeleton() {
  return (
    <div className="space-y-3 rounded-card border border-border bg-card p-5 shadow-card">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiTileSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiTileSkeleton key={i} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>

      <Skeleton className="h-40 rounded-card" />

      <div className="space-y-3 rounded-card border border-border bg-card p-5 shadow-card">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
