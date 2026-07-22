"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
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
    return keys;
  }, [availableYears]);

  const monthsByYear = useMemo(() => {
    const groups = new Map<number, MonthKey[]>();
    for (const key of availableMonths) {
      const group = groups.get(key.year);
      if (group) group.push(key);
      else groups.set(key.year, [key]);
    }
    return [...groups.entries()];
  }, [availableMonths]);

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
    <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-card">
      <div className="p-5 pb-0">
        <span className="text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">{labels.eyebrow}</span>
        <h2 className="mt-0.5 text-[20px] font-bold text-veltol-fg">{labels.title}</h2>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-veltol-fg shadow-sm transition-colors hover:bg-[#F3F6FC]">
              {labels.selectMonths}
              {selected.length > 0 && ` (${selected.length})`}
              <ChevronDownIcon className="size-3.5 text-veltol-faint" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {monthsByYear.map(([year, months], groupIndex) => (
                <DropdownMenuGroup key={year}>
                  {groupIndex > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{year}</DropdownMenuLabel>
                  {months.map((point) => (
                    <DropdownMenuCheckboxItem
                      key={keyOf(point)}
                      checked={selectedSet.has(keyOf(point))}
                      onCheckedChange={() => toggle(point)}
                      closeOnClick={false}
                    >
                      {monthNames[point.month]}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selected.length > 0 && (
            <Button variant="ghost" size="xs" onClick={() => setSelected([])}>
              {labels.clearSelection}
            </Button>
          )}
        </div>

        <div className="mt-4">
          {data.length > 0 ? (
            <ChartContainer>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-veltol-border)" vertical={false} />
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
          <p className="mt-3 text-[12px] text-veltol-fgMute">{labels.excludedNote}</p>
        )}
      </div>
    </div>
  );
}
