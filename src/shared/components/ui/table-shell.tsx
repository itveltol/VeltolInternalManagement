import * as React from "react";
import { cn } from "@/shared/utils/cn";

const TableShell = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(function TableShell(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="table-shell"
      className={cn("overflow-hidden rounded-card border border-border bg-card shadow-card", className)}
      {...props}
    />
  );
});

function TableToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-toolbar"
      className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-6", className)}
      {...props}
    />
  );
}

function TableDesktopView({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="table-desktop-view"
      className={cn("hidden overflow-x-auto md:block", className)}
      {...props}
    />
  );
}

export { TableShell, TableToolbar, TableDesktopView };
