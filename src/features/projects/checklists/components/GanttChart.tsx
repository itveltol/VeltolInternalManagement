"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CalendarOff, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import type { ChecklistRow } from "@/features/projects/checklists/types";

const TEAM_COLORS = [
  "bg-veltol-accent/70 border-veltol-accent",
  "bg-veltol-primary/70 border-veltol-primary",
  "bg-veltol-orange/70 border-veltol-orange",
  "bg-veltol-green/70 border-veltol-green",
  "bg-veltol-red/70 border-veltol-red",
  "bg-purple-400/70 border-purple-400",
];

const TEAM_LINE_COLORS = [
  "bg-veltol-accent",
  "bg-veltol-primary",
  "bg-veltol-orange",
  "bg-veltol-green",
  "bg-veltol-red",
  "bg-purple-400",
];

function teamColor(teamId: number | null): string {
  if (teamId == null) return "bg-veltol-fgMute/40 border-veltol-fgMute";
  return TEAM_COLORS[teamId % TEAM_COLORS.length];
}

function teamLineColor(teamId: number | null): string {
  if (teamId == null) return "bg-veltol-fgMute";
  return TEAM_LINE_COLORS[teamId % TEAM_LINE_COLORS.length];
}

function toDayMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  rows: ChecklistRow[];
  onSchedule: (row: ChecklistRow) => void;
  onDelete: (row: ChecklistRow) => void;
  onUnschedule: (row: ChecklistRow) => void;
  canMutate: boolean;
}

export function GanttChart({ rows, onSchedule, onDelete, onUnschedule, canMutate }: Props) {
  const t = useTranslations("checklist");

  const taskRows = rows.filter((r) => !r.isSection);
  const scheduled = taskRows.filter((r) => r.record?.start_date && r.record?.end_date);
  const unscheduled = taskRows.filter((r) => !(r.record?.start_date && r.record?.end_date));

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (scheduled.length === 0) {
      const now = toDayMs(new Date().toISOString().slice(0, 10));
      return { rangeStart: now, rangeEnd: now + 30 * DAY_MS };
    }
    const starts = scheduled.map((r) => toDayMs(r.record!.start_date!));
    const ends = scheduled.map((r) => toDayMs(r.record!.end_date!));
    const min = Math.min(...starts);
    const max = Math.max(...ends);
    const pad = Math.max(DAY_MS, (max - min) * 0.05);
    return { rangeStart: min - pad, rangeEnd: max + pad };
  }, [scheduled]);

  const totalSpan = Math.max(DAY_MS, rangeEnd - rangeStart);

  const monthMarkers = useMemo(() => {
    const markers: { label: string; leftPct: number }[] = [];
    const start = new Date(rangeStart);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor.getTime() < rangeEnd) {
      const ms = cursor.getTime();
      if (ms >= rangeStart) {
        markers.push({
          label: cursor.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
          leftPct: ((ms - rangeStart) / totalSpan) * 100,
        });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return markers;
  }, [rangeStart, rangeEnd, totalSpan]);

  const todayPct = useMemo(() => {
    const today = toDayMs(new Date().toISOString().slice(0, 10));
    if (today < rangeStart || today > rangeEnd) return null;
    return ((today - rangeStart) / totalSpan) * 100;
  }, [rangeStart, rangeEnd, totalSpan]);

  const rangeStartLabel = new Date(rangeStart).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const rangeEndLabel = new Date(rangeEnd).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  function shortDate(ms: number) {
    return new Date(ms).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  }

  return (
    <div className="space-y-6">
      {unscheduled.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-[11px] font-medium text-veltol-fgMute">
            {t("gantt.unscheduled", { count: unscheduled.length })}
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((row) => (
              <div
                key={row.rowKey}
                className="flex items-center rounded-lg border border-border bg-veltol-surface/50 transition-colors hover:border-veltol-accent/40 hover:bg-veltol-surface/80"
              >
                <button
                  type="button"
                  disabled={!canMutate}
                  onClick={() => onSchedule(row)}
                  className="px-3 py-1.5 text-left text-[12px] text-veltol-fg disabled:cursor-default disabled:opacity-70"
                >
                  {row.activitate}
                  {row.isCustom && (
                    <span className="ml-1.5 font-mono text-[9px] uppercase text-veltol-fgMute">
                      {t("gantt.customBadge")}
                    </span>
                  )}
                </button>
                {canMutate && row.isCustom && (
                  <button
                    type="button"
                    onClick={() => onDelete(row)}
                    title={t("gantt.deleteTask")}
                    className="mr-1 rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-red/10 hover:text-veltol-red"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {scheduled.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-veltol-fgMute">
          {t("gantt.emptyState")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex border-b border-border">
            <div className="flex w-64 shrink-0 flex-col justify-center gap-0.5 border-r border-border px-4 py-2">
              <span className="text-[11px] font-medium text-veltol-fgMute">{t("gantt.taskColumn")}</span>
              <span className="font-mono text-[10px] text-veltol-fgMute/70">
                {rangeStartLabel} → {rangeEndLabel}
              </span>
            </div>
            <div className="relative flex-1 py-2">
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex h-full flex-col items-start"
                  style={{ left: `${m.leftPct}%` }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-veltol-fgMute">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative divide-y divide-border pt-5">
            {/* Date lines spanning the full chart body, drawn above row content so they cross every row */}
            <div className="pointer-events-none absolute inset-0 left-64 z-10">
              {monthMarkers.map((m, i) => (
                <div
                  key={i}
                  className="absolute inset-y-0 w-px bg-border"
                  style={{ left: `${m.leftPct}%` }}
                />
              ))}
              {scheduled.map((row) => {
                const start = toDayMs(row.record!.start_date!);
                const end = toDayMs(row.record!.end_date!) + DAY_MS;
                const startPct = ((start - rangeStart) / totalSpan) * 100;
                const endPct = ((end - rangeStart) / totalSpan) * 100;
                const color = teamLineColor(row.record?.team_id ?? null);
                return (
                  <div key={row.rowKey}>
                    <div className={`absolute inset-y-0 w-px opacity-70 ${color}`} style={{ left: `${startPct}%` }}>
                      <span className={`absolute -top-5 left-1 whitespace-nowrap rounded px-1 font-mono text-[8px] font-medium text-white ${color}`}>
                        {shortDate(start)}
                      </span>
                    </div>
                    <div className={`absolute inset-y-0 w-px opacity-70 ${color}`} style={{ left: `${endPct}%` }}>
                      <span className={`absolute -top-5 left-1 whitespace-nowrap rounded px-1 font-mono text-[8px] font-medium text-white ${color}`}>
                        {shortDate(end - DAY_MS)}
                      </span>
                    </div>
                  </div>
                );
              })}
              {todayPct !== null && (
                <div
                  className="absolute inset-y-0 w-px bg-veltol-accent"
                  style={{ left: `${todayPct}%` }}
                >
                  <span className="absolute -top-5 left-1 whitespace-nowrap rounded bg-veltol-accent px-1 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white">
                    {t("gantt.today")}
                  </span>
                </div>
              )}
            </div>

            {scheduled.map((row) => {
              const start = toDayMs(row.record!.start_date!);
              const end = toDayMs(row.record!.end_date!) + DAY_MS;
              const leftPct = ((start - rangeStart) / totalSpan) * 100;
              const widthPct = Math.max(1, ((end - start) / totalSpan) * 100);
              const pct = row.pct ?? 0;

              return (
                <div key={row.rowKey} className="flex items-center hover:bg-veltol-surface/50">
                  <div className="flex w-64 shrink-0 items-center gap-2 border-r border-border px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-veltol-fg">{row.activitate}</div>
                      {row.record?.team && (
                        <Badge variant="secondary" className="mt-1">{row.record.team.name}</Badge>
                      )}
                    </div>
                    {canMutate && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onUnschedule(row)}
                          title={t("gantt.unscheduleTask")}
                          className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-surface hover:text-veltol-fg"
                        >
                          <CalendarOff className="h-3 w-3" />
                        </button>
                        {row.isCustom && (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            title={t("gantt.deleteTask")}
                            className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-red/10 hover:text-veltol-red"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="relative h-12 flex-1 px-1">
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => onSchedule(row)}
                      className={`group absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-md border ${teamColor(row.record?.team_id ?? null)} transition-opacity hover:opacity-90 disabled:cursor-default`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      title={`${row.activitate} · ${row.record?.start_date} → ${row.record?.end_date}`}
                    >
                      <div
                        className="h-full bg-black/25"
                        style={{ width: `${100 - pct}%`, marginLeft: `${pct}%` }}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
