import { Skeleton } from "@/shared/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-10 w-32 shrink-0 rounded-md" />
    </div>
  );
}
