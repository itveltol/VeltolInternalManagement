import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ProjectDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-72" />

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-40" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-12 w-24 shrink-0" />
      </div>

      <div className="flex gap-2 border-b border-border pb-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>

      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}
