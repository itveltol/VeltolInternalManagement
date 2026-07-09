"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
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

  const data = useMemo(
    () =>
      getMonthlyIncomeForYear(projects, selectedYear).map((point) => ({
        ...point,
        monthLabel: monthNames[point.month],
      })),
    [projects, selectedYear, monthNames],
  );

  const hasData = data.some((point) => point.totalEur > 0);
  const numberFormatter = new Intl.NumberFormat(tag, { notation: "compact" });
  const fullNumberFormatter = new Intl.NumberFormat(tag);

  return (
    <div className="v-panel v-hairline relative overflow-hidden rounded-xl">
      <div className="flex items-center justify-between p-5 pb-0">
        <div>
          <span className="mono-label text-[10px] text-veltol-fgMute">{labels.eyebrow}</span>
          <h2 className="mt-0.5 font-display text-base font-semibold text-veltol-fg">{labels.title}</h2>
        </div>
        {availableYears.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-veltol-aqua/15 bg-veltol-surface/40 px-2.5 py-1.5 font-mono text-[11px] text-veltol-fg transition-colors hover:bg-veltol-surface/70">
              {labels.yearLabel}: {selectedYear}
              <ChevronDownIcon className="size-3.5" />
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

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-veltol-aqua/20 to-transparent" />

      <div className="p-5">
        {hasData ? (
          <ChartContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeByMonthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-veltol-aqua)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--color-veltol-teal)" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="monthLabel"
                tick={{ fill: "var(--color-veltol-fgMute)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-veltol-fgMute)", fontSize: 11 }}
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
              <Bar dataKey="totalEur" name={labels.incomeLabel} fill="url(#incomeByMonthGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-veltol-fgDim">
            {labels.noData}
          </div>
        )}

        {labels.excludedNote && (
          <p className="mt-3 text-[11px] text-veltol-fgMute">{labels.excludedNote}</p>
        )}
      </div>
    </div>
  );
}
