import * as React from "react";
import { cn } from "@/shared/utils/cn";

function DataCardList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-list"
      className={cn("divide-y divide-border md:hidden", className)}
      {...props}
    />
  );
}

interface DataCardProps extends React.ComponentProps<"div"> {
  onClick?: () => void;
}

const DataCard = React.forwardRef<HTMLDivElement, DataCardProps>(function DataCard(
  { className, onClick, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="data-card"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      className={cn(
        "flex flex-col gap-2.5 px-4 py-3.5 transition-colors",
        onClick && "cursor-pointer active:bg-veltol-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

function DataCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-header"
      className={cn("flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

function DataCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-title"
      className={cn("min-w-0 truncate text-[14px] font-semibold text-veltol-fg", className)}
      {...props}
    />
  );
}

function DataCardSubtitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-subtitle"
      className={cn("mt-0.5 truncate text-[12px] text-veltol-fgDim", className)}
      {...props}
    />
  );
}

function DataCardBadgeSlot({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-badge"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

function DataCardBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-body"
      className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}
      {...props}
    />
  );
}

function DataCardField({
  label,
  children,
  full,
  className,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", full && "col-span-2", className)}>
      <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-veltol-fgMute">{label}</div>
      <div className="mt-0.5 text-[12.5px] text-veltol-fgDim">{children}</div>
    </div>
  );
}

function DataCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="data-card-footer"
      className={cn("-mx-1 mt-1 flex flex-wrap items-center gap-2 border-t border-border pt-2.5", className)}
      onClick={(e) => e.stopPropagation()}
      {...props}
    />
  );
}

export {
  DataCardList,
  DataCard,
  DataCardHeader,
  DataCardTitle,
  DataCardSubtitle,
  DataCardBadgeSlot,
  DataCardBody,
  DataCardField,
  DataCardFooter,
};
