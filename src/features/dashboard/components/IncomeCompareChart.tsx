"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/utils/cn";
import { ChartContainer, ChartTooltipContent } from "@/shared/components/ui/chart";
import { getIncomeForMonths, type MonthKey } from "../lib/income";
import type { DashboardProject } from "@/app/[locale]/(app)/dashboard/action";

interface Labels {
  eyebrow: string;
  title: string;
  selectMonths: string;
  clearSelection: string;
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

function keyOf(k: MonthKey) {
  return `${k.year}-${k.month}`;
}

export function IncomeCompareChart({ projects, availableYears, labels }: Props) {
  const locale = useLocale();
  const tag = localeTag(locale);

  const monthNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(tag, { month: "short" });
    return Array.from({ length: 12 }, (_, m) => formatter.format(new Date(Date.UTC(2000, m, 1))));
  }, [tag]);

  const availableMonths = useMemo(() => {
    const keys: MonthKey[] = [];
    for (const year of availableYears) {
      for (let month = 11; month >= 0; month--) keys.push({ year, month });
    }
    const income = getIncomeForMonths(projects, keys);
    return income.filter((point) => point.projectCount > 0);
  }, [projects, availableYears]);

  const [selected, setSelected] = useState<MonthKey[]>(() => availableMonths.slice(0, 6));

  const selectedSet = useMemo(() => new Set(selected.map(keyOf)), [selected]);

  const sortedSelection = useMemo(
    () => [...selected].sort((a, b) => (a.year - b.year) || (a.month - b.month)),
    [selected],
  );

  const data = useMemo(
    () =>
      getIncomeForMonths(projects, sortedSelection).map((point) => ({
        ...point,
        monthLabel: `${monthNames[point.month]} ${point.year}`,
      })),
    [projects, sortedSelection, monthNames],
  );

  function toggle(k: MonthKey) {
    setSelected((prev) =>
      prev.some((p) => keyOf(p) === keyOf(k)) ? prev.filter((p) => keyOf(p) !== keyOf(k)) : [...prev, k],
    );
  }

  const numberFormatter = new Intl.NumberFormat(tag, { notation: "compact" });
  const fullNumberFormatter = new Intl.NumberFormat(tag);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="p-5 pb-0">
        <span className="text-xs font-medium text-veltol-fgMute">{labels.eyebrow}</span>
        <h2 className="mt-0.5 text-base font-semibold text-veltol-fg">{labels.title}</h2>
      </div>

      <div className="mt-4 h-px bg-border" />

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-veltol-fgMute">{labels.selectMonths}</span>
          {availableMonths.map((point) => {
            const active = selectedSet.has(keyOf(point));
            return (
              <button
                key={keyOf(point)}
                type="button"
                onClick={() => toggle(point)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  active
                    ? "border-veltol-accent/40 bg-veltol-accent/15 text-veltol-accent"
                    : "border-border bg-veltol-surface/30 text-veltol-fgMute hover:text-veltol-fg",
                )}
              >
                {monthNames[point.month]} {point.year}
              </button>
            );
          })}
          {selected.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => setSelected([])} className="ml-1">
              {labels.clearSelection}
            </Button>
          )}
        </div>

        <div className="mt-4">
          {data.length > 0 ? (
            <ChartContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                <Bar
                  dataKey="totalEur"
                  name={labels.incomeLabel}
                  fill="var(--color-veltol-primary)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-veltol-fgDim">
              {labels.noData}
            </div>
          )}
        </div>

        {labels.excludedNote && (
          <p className="mt-3 text-[11px] text-veltol-fgMute">{labels.excludedNote}</p>
        )}
      </div>
    </div>
  );
}
