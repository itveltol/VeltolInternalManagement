import * as React from "react";
import { cn } from "@/shared/utils/cn";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(SELECT_CLASS, className)} {...props} />;
}

export { Select, SELECT_CLASS };
