import { Skeleton } from "@/shared/components/ui/skeleton";

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-48" />

      <div className="rounded-card border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-9 w-64" />
          </div>
          <Skeleton className="h-8 w-24 shrink-0" />
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-px">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
    </div>
  );
}
