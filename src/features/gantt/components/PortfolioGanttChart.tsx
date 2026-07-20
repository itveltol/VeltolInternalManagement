"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import type { ProjectGanttRow, GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { cn } from "@/shared/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDayMs(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getTime();
}

function shortDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

/** A segment only has a valid, renderable range when end is on/after start */
function hasValidRange(segment: GanttPhaseSegment): boolean {
  if (!segment.startDate || !segment.endDate) return false;
  return toDayMs(segment.endDate) >= toDayMs(segment.startDate);
}

interface Props {
  rows: ProjectGanttRow[];
  todayMs: number;
  onSegmentClick: (projectId: number, segment: GanttPhaseSegment) => void;
  onHideProject: (projectId: number) => void;
  pagination?: ReactNode;
}

export function PortfolioGanttChart({ rows, todayMs, onSegmentClick, onHideProject, pagination }: Props) {
  const t = useTranslations("gantt");

  const datedSegments = useMemo(
    () => rows.flatMap((row) => row.segments.filter(hasValidRange)),
    [rows],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (datedSegments.length === 0) {
      return { rangeStart: todayMs, rangeEnd: todayMs + 90 * DAY_MS };
    }
    const starts = datedSegments.map((s) => toDayMs(s.startDate!));
    const ends = datedSegments.map((s) => toDayMs(s.endDate!) + DAY_MS);
    const min = Math.min(...starts, todayMs);
    const max = Math.max(...ends, todayMs);
    const pad = Math.max(DAY_MS, (max - min) * 0.05);
    return { rangeStart: min - pad, rangeEnd: max + pad };
  }, [datedSegments, todayMs]);

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

  const todayPct = todayMs >= rangeStart && todayMs <= rangeEnd
    ? ((todayMs - rangeStart) / totalSpan) * 100
    : null;

  const rangeStartLabel = new Date(rangeStart).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
  const rangeEndLabel = new Date(rangeEnd).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-veltol-fgMute">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex border-b border-border">
        <div className="flex w-64 shrink-0 flex-col justify-center gap-0.5 border-r border-border px-4 py-2">
          <span className="text-[11px] font-medium text-veltol-fgMute">{t("projectColumn")}</span>
          <span className="font-mono text-[10px] text-veltol-fgMute/70">
            {rangeStartLabel} → {rangeEndLabel}
          </span>
        </div>
        <div className="relative flex-1 py-2">
          {monthMarkers.map((m, i) => (
            <div key={i} className="absolute top-0 flex h-full flex-col items-start" style={{ left: `${m.leftPct}%` }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-veltol-fgMute">
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative divide-y divide-border pt-5">
        <div className="pointer-events-none absolute inset-0 left-64 z-10">
          {monthMarkers.map((m, i) => (
            <div key={i} className="absolute inset-y-0 w-px bg-border" style={{ left: `${m.leftPct}%` }} />
          ))}
          {datedSegments.map((segment, i) => {
            const start = toDayMs(segment.startDate!);
            const end = toDayMs(segment.endDate!) + DAY_MS;
            const startPct = ((start - rangeStart) / totalSpan) * 100;
            const endPct = ((end - rangeStart) / totalSpan) * 100;
            const color = GANTT_PHASE_COLOR[segment.key].line;
            return (
              <div key={i}>
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
            <div className="absolute inset-y-0 w-px bg-veltol-accent" style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-5 left-1 whitespace-nowrap rounded bg-veltol-accent px-1 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white">
                {t("today")}
              </span>
            </div>
          )}
        </div>

        {rows.map(({ project, segments }) => (
          <div key={project.id} className="group/row flex items-center hover:bg-veltol-surface/50">
            <div className="flex w-64 shrink-0 items-center gap-2 border-r border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-veltol-fg">{project.name}</span>
                {project.project_type && (
                  <span className="font-mono text-[9px] uppercase tracking-wide text-veltol-fgMute">
                    {project.project_type}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onHideProject(project.id)}
                title={t("hideProject")}
                className="shrink-0 rounded p-1 text-veltol-fgMute opacity-0 transition-opacity hover:bg-veltol-red/10 hover:text-veltol-red group-hover/row:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <div className="relative h-14 flex-1 px-1">
              {segments.map((segment) => {
                const color = GANTT_PHASE_COLOR[segment.key];

                if (!segment.startDate || !segment.endDate) {
                  return (
                    <PlaceholderSegment
                      key={segment.key}
                      segment={segment}
                      label={t(`phase.${segment.key}`)}
                      onClick={() => onSegmentClick(project.id, segment)}
                    />
                  );
                }

                if (!hasValidRange(segment)) {
                  return (
                    <InvalidRangeSegment
                      key={segment.key}
                      segment={segment}
                      label={t(`phase.${segment.key}`)}
                      onClick={() => onSegmentClick(project.id, segment)}
                    />
                  );
                }

                const start = toDayMs(segment.startDate!);
                const end = toDayMs(segment.endDate!) + DAY_MS;
                const leftPct = ((start - rangeStart) / totalSpan) * 100;
                const widthPct = Math.max(1, ((end - start) / totalSpan) * 100);
                const title = segment.disabled
                  ? `${t(`phase.${segment.key}`)} · ${t("notContracted")}`
                  : `${t(`phase.${segment.key}`)} · ${segment.pct}% · ${segment.startDate} → ${segment.endDate}`;

                return (
                  <button
                    key={segment.key}
                    type="button"
                    disabled={segment.disabled}
                    onClick={() => onSegmentClick(project.id, segment)}
                    title={title}
                    className={cn(
                      "group absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-md border transition-opacity hover:opacity-90",
                      segment.disabled
                        ? "border-dashed border-veltol-fgMute/30 bg-veltol-fgMute/10 opacity-60"
                        : color.fill,
                    )}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  >
                    {!segment.disabled && (
                      <div
                        className="h-full bg-black/25"
                        style={{ width: `${100 - segment.pct}%`, marginLeft: `${segment.pct}%` }}
                      />
                    )}
                    {!segment.disabled && segment.variance === "behind" && (
                      <AlertTriangle className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-white drop-shadow" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {pagination}
    </div>
  );
}

function InvalidRangeSegment({
  segment,
  label,
  onClick,
}: {
  segment: GanttPhaseSegment;
  label: string;
  onClick: () => void;
}) {
  const index = GANTT_PHASE_KEYS.indexOf(segment.key);
  const widthPct = 100 / GANTT_PHASE_KEYS.length;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label}: end date is before start date — click to fix`}
      className="absolute top-1/2 flex h-6 -translate-y-1/2 items-center justify-center gap-1 overflow-hidden rounded-md border border-dashed border-veltol-red/50 bg-veltol-red/10 text-[9px] text-veltol-red transition-colors hover:bg-veltol-red/20"
      style={{ left: `${index * widthPct}%`, width: `${widthPct}%` }}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {label}
    </button>
  );
}

function PlaceholderSegment({
  segment,
  label,
  onClick,
}: {
  segment: GanttPhaseSegment;
  label: string;
  onClick: () => void;
}) {
  const index = GANTT_PHASE_KEYS.indexOf(segment.key);
  const widthPct = 100 / GANTT_PHASE_KEYS.length;
  return (
    <button
      type="button"
      disabled={segment.disabled}
      onClick={onClick}
      title={label}
      className={cn(
        "absolute top-1/2 h-6 -translate-y-1/2 overflow-hidden rounded-md border border-dashed text-[9px] transition-colors",
        segment.disabled
          ? "border-veltol-fgMute/20 bg-veltol-fgMute/5 text-veltol-fgMute/30 opacity-60"
          : "border-veltol-fgMute/40 bg-veltol-fgMute/5 text-veltol-fgMute/60 hover:border-veltol-accent/50 hover:bg-veltol-accent/10 hover:text-veltol-accent",
      )}
      style={{ left: `${index * widthPct}%`, width: `${widthPct}%` }}
    >
      {label}
    </button>
  );
}
