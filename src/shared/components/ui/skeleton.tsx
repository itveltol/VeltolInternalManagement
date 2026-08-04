import { cn } from "@/shared/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-veltol-surface", className)}
      {...props}
    />
  );
}

export { Skeleton };
