"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Area, AreaChart, XAxis, YAxis, Tooltip } from "recharts";
import type { DotItemDotProps } from "recharts";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/shared/components/ui/dropdown-menu";
import { ChartContainer, ChartTooltipContent } from "@/shared/components/ui/chart";
import { getMonthlyIncomeForYear } from "../lib/income";
import type { DashboardProject } from "@/app/[locale]/(app)/dashboard/action";

interface Labels {
  eyebrow: string;
  title: string;
  yearLabel: string;
  noData: string;
  incomeLabel: string;
  totalLabel: string;
  excludedNote: string | null;
}

interface Props {
  projects: DashboardProject[];
  availableYears: number[];
  labels: Labels;
}

function localeTag(locale: string) {
  return locale === "hu" ? "hu-HU" : locale === "ro" ? "ro-RO" : "en-GB";
}

export function IncomeByMonthChart({ projects, availableYears, labels }: Props) {
  const locale = useLocale();
  const tag = localeTag(locale);
  const currentYear = new Date().getUTCFullYear();
  const [selectedYear, setSelectedYear] = useState(availableYears[0] ?? currentYear);

  const monthNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { month: "short" });
    return Array.from({ length: 12 }, (_, m) => formatter.format(new Date(Date.UTC(2000, m, 1))));
  }, [tag]);

  const data = useMemo(() => {
    return getMonthlyIncomeForYear(projects, selectedYear).map((point) => ({
      ...point,
      monthLabel: monthNames[point.month],
    }));
  }, [projects, selectedYear, monthNames]);

  const yearTotal = useMemo(
    () => data.reduce((sum, point) => sum + point.totalEur, 0),
    [data],
  );

  const hasData = data.some((point) => point.totalEur > 0);
  const numberFormatter = new Intl.NumberFormat(tag, { notation: "compact" });
  const fullNumberFormatter = new Intl.NumberFormat(tag);

  function renderEndDot(props: DotItemDotProps) {
    const { cx, cy, index } = props;
    if (index !== data.length - 1 || cx == null || cy == null) return <g />;
    return (
      <g>
        <circle cx={cx} cy={cy} r={7} fill="var(--color-veltol-primary)" stroke="var(--color-card)" strokeWidth={2} />
      </g>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="flex items-center justify-between p-5 pb-0">
        <div>
          <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{labels.eyebrow}</span>
          <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{labels.title}</h2>
        </div>
        {availableYears.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-veltol-fg shadow-sm transition-colors hover:bg-[#F3F6FC]">
              <span className="size-1.5 rounded-full bg-veltol-accent" />
              {labels.yearLabel}: {selectedYear}
              <ChevronDownIcon className="size-3.5 text-veltol-faint" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableYears.map((year) => (
                <DropdownMenuItem key={year} onClick={() => setSelectedYear(year)}>
                  {year}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="p-5">
        {hasData ? (
          <ChartContainer>
            <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-veltol-primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--color-veltol-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: "var(--color-veltol-faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-veltol-faint)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => numberFormatter.format(value)}
                width={48}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltipContent
                    {...props}
                    formatter={(value) => `${fullNumberFormatter.format(Number(value))} EUR`}
                  />
                )}
              />
              <Area
                dataKey="totalEur"
                name={labels.incomeLabel}
                type="monotone"
                stroke="var(--color-veltol-primary)"
                strokeWidth={2.4}
                fill="url(#incomeAreaFill)"
                dot={renderEndDot}
                activeDot={{ r: 5, fill: "var(--color-veltol-primary)", stroke: "var(--color-card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-veltol-fgDim">
            {labels.noData}
          </div>
        )}

        {hasData && (
          <p className="mt-3 text-[13px] font-medium text-veltol-fgDim">
            {labels.totalLabel}: <span className="font-semibold text-veltol-fg">{fullNumberFormatter.format(yearTotal)} EUR</span>
          </p>
        )}

        {labels.excludedNote && (
          <p className="mt-1.5 text-[12px] text-veltol-fgMute">{labels.excludedNote}</p>
        )}
      </div>
    </div>
  );
}
