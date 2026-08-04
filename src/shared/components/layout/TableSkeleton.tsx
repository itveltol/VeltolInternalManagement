import { Skeleton } from "@/shared/components/ui/skeleton";

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="px-6 py-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: rows }).map((_, row) => (
            Array.from({ length: cols }).map((_, col) => (
              <Skeleton key={`${row}-${col}`} className="h-4 w-full" />
            ))
          ))}
        </div>
      </div>
    </div>
  );
}
