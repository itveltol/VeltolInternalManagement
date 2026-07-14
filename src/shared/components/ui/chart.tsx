"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { cn } from "@/shared/utils/cn";

function ChartContainer({
  className,
  children,
  height = 280,
  ...props
}: React.ComponentProps<"div"> & { height?: number; children: React.ReactElement }) {
  return (
    <div data-slot="chart-container" className={cn("w-full", className)} {...props}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
}: TooltipContentProps<ValueType, NameType> & { formatter?: (value: ValueType | undefined) => string }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      data-slot="chart-tooltip"
      className="rounded-lg border border-border bg-popover px-3 py-2 shadow-sm"
    >
      <div className="text-[11px] font-medium text-veltol-fgMute">{label}</div>
      {payload.map((entry) => (
        <div
          key={String(entry.dataKey)}
          className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-veltol-fg"
        >
          <span className="inline-block size-2 rounded-full" style={{ background: entry.color }} />
          {formatter ? formatter(entry.value) : entry.value}
        </div>
      ))}
    </div>
  );
}

export { ChartContainer, ChartTooltipContent };
