"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarDays, X } from "lucide-react";
import type { ProjectGanttRow, GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { cn } from "@/shared/utils/cn";
import { DAY_MS, toDayMs, buildMonthWeekMarkers } from "@/shared/utils/ganttTimeline";
import { formatDate } from "@/shared/utils/formatDate";

function shortDate(ms: number): string {
  return formatDate(new Date(ms), { day: "2-digit", month: "short", year: undefined });
}

/** A segment only has a valid, renderable range when end is on/after start */
function hasValidRange(segment: GanttPhaseSegment): boolean {
  if (!segment.startDate || !segment.endDate) return false;
  return toDayMs(segment.endDate) >= toDayMs(segment.startDate);
}

interface Props {
  rows: ProjectGanttRow[];
  todayMs: number;
  onNavigateToPhase: (projectId: number, segment: GanttPhaseSegment) => void;
  onEditDates: (projectId: number, segment: GanttPhaseSegment) => void;
  onHideProject: (projectId: number) => void;
  pagination?: ReactNode;
}

export function PortfolioGanttChart({ rows, todayMs, onNavigateToPhase, onEditDates, onHideProject, pagination }: Props) {
  const t = useTranslations("gantt");
  const [hoveredSegmentKey, setHoveredSegmentKey] = useState<string | null>(null);

  const datedSegments = useMemo(
    () => rows.flatMap((row) => row.segments.filter(hasValidRange).map((segment) => ({ projectId: row.project.id, segment }))),
    [rows],
  );

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (datedSegments.length === 0) {
      return { rangeStart: todayMs, rangeEnd: todayMs + 90 * DAY_MS };
    }
    const starts = datedSegments.map(({ segment }) => toDayMs(segment.startDate!));
    const ends = datedSegments.map(({ segment }) => toDayMs(segment.endDate!) + DAY_MS);
    const min = Math.min(...starts, todayMs);
    const max = Math.max(...ends, todayMs);
    const pad = Math.max(DAY_MS, (max - min) * 0.05);
    return { rangeStart: min - pad, rangeEnd: max + pad };
  }, [datedSegments, todayMs]);

  const totalSpan = Math.max(DAY_MS, rangeEnd - rangeStart);

  const monthMarkers = useMemo(
    () => buildMonthWeekMarkers(rangeStart, rangeEnd, totalSpan),
    [rangeStart, rangeEnd, totalSpan],
  );

  const weekMarkers = useMemo(
    () => monthMarkers.flatMap((m) => m.weeks),
    [monthMarkers],
  );

  const todayPct = todayMs >= rangeStart && todayMs <= rangeEnd
    ? ((todayMs - rangeStart) / totalSpan) * 100
    : null;

  const rangeStartLabel = formatDate(new Date(rangeStart), { day: "2-digit", month: "short", year: undefined });
  const rangeEndLabel = formatDate(new Date(rangeEnd), { day: "2-digit", month: "short", year: "numeric" });

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-veltol-fgMute">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="flex border-b border-border bg-veltol-surface/40">
        <div className="flex w-64 shrink-0 flex-col justify-center gap-0.5 border-r border-border px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-veltol-fgMute">{t("projectColumn")}</span>
          <span className="font-mono text-[10px] text-veltol-fgMute/70">
            {rangeStartLabel} → {rangeEndLabel}
          </span>
        </div>
        <div className="relative flex-1 py-2">
          <div className="relative h-4">
            {monthMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute top-0 flex h-full items-start justify-center overflow-hidden"
                style={{ left: `${m.leftPct}%`, width: `${m.widthPct}%` }}
              >
                <span className="truncate rounded-full bg-card px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-veltol-fgDim shadow-sm">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-1.5 h-3 border-t border-border/60">
            {weekMarkers.map((w, i) => (
              <div
                key={i}
                className="absolute top-0 flex h-full items-center border-l border-border/40 pl-1 first:border-l-0"
                style={{ left: `${w.leftPct}%`, width: `${w.widthPct}%` }}
              >
                <span className="truncate font-mono text-[8px] text-veltol-fgMute/60">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative divide-y divide-border/70 pt-5">
        <div className="pointer-events-none absolute inset-0 left-64 z-10">
          {weekMarkers.map((w, i) => (
            <div key={i} className="absolute inset-y-0 w-px bg-border opacity-40" style={{ left: `${w.leftPct}%` }} />
          ))}
          {monthMarkers.map((m, i) => (
            <div key={i} className="absolute inset-y-0 w-px bg-border" style={{ left: `${m.leftPct}%` }} />
          ))}
          {datedSegments.map(({ projectId, segment }) => {
            const segmentKey = `${projectId}:${segment.key}`;
            if (segmentKey !== hoveredSegmentKey) return null;
            const start = toDayMs(segment.startDate!);
            const end = toDayMs(segment.endDate!) + DAY_MS;
            const startPct = ((start - rangeStart) / totalSpan) * 100;
            const endPct = ((end - rangeStart) / totalSpan) * 100;
            const color = GANTT_PHASE_COLOR[segment.key].line;
            return (
              <div key={segmentKey}>
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
            <div className="absolute inset-y-0 w-px bg-veltol-primary" style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-veltol-primary px-2 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.05em] text-white shadow-sm">
                {t("today")}
              </span>
            </div>
          )}
        </div>

        {rows.map(({ project, segments }) => (
          <div key={project.id} className="group/row flex transition-colors hover:bg-veltol-surface/40">
            <div className="flex w-64 shrink-0 items-center gap-2 border-r border-border px-4 py-4">
              <div className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-veltol-fg">{project.name}</span>
                {project.team?.name && (
                  <span className="block truncate font-mono text-[9px] text-veltol-fgMute">{project.team.name}</span>
                )}
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
            <div className="flex flex-1 flex-col divide-y divide-border/50 px-1 py-1">
              {GANTT_PHASE_KEYS.map((key) => {
                const segment = segments.find((s) => s.key === key)!;
                const color = GANTT_PHASE_COLOR[segment.key];

                return (
                  <div key={key} className="relative h-11">
                    {!segment.startDate || !segment.endDate ? (
                      <PlaceholderSegment
                        segment={segment}
                        label={t(`phase.${segment.key}`)}
                        onClick={() => onEditDates(project.id, segment)}
                      />
                    ) : !hasValidRange(segment) ? (
                      <InvalidRangeSegment
                        label={t(`phase.${segment.key}`)}
                        onClick={() => onEditDates(project.id, segment)}
                      />
                    ) : (
                      (() => {
                        const start = toDayMs(segment.startDate!);
                        const end = toDayMs(segment.endDate!) + DAY_MS;
                        const leftPct = ((start - rangeStart) / totalSpan) * 100;
                        const widthPct = Math.max(1, ((end - start) / totalSpan) * 100);
                        const navTitle = segment.disabled
                          ? `${t(`phase.${segment.key}`)} · ${t("notContracted")}`
                          : `${t(`phase.${segment.key}`)} · ${segment.pct}% · ${segment.startDate} → ${segment.endDate}`;
                        const dateTitle = `${segment.startDate} → ${segment.endDate}`;

                        return (
                          <div
                            className={cn(
                              "group absolute top-1/2 flex h-7 -translate-y-1/2 items-stretch overflow-hidden rounded-full border shadow-sm transition-all hover:brightness-105 hover:shadow-md",
                              segment.disabled
                                ? "border-dashed border-veltol-fgMute/30 bg-veltol-fgMute/10 opacity-60"
                                : color.fill,
                            )}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            onMouseEnter={() => setHoveredSegmentKey(`${project.id}:${segment.key}`)}
                            onMouseLeave={() => setHoveredSegmentKey(null)}
                          >
                            <button
                              type="button"
                              disabled={segment.disabled}
                              onClick={() => onNavigateToPhase(project.id, segment)}
                              title={navTitle}
                              className="relative flex min-w-0 flex-[2] items-center overflow-hidden"
                            >
                              {!segment.disabled && (
                                <div
                                  className="absolute inset-y-0 right-0 bg-black/20"
                                  style={{ width: `${Math.min(100, Math.max(0, (100 - segment.pct) * 1.5))}%` }}
                                />
                              )}
                              {!segment.disabled && (
                                <span className="relative truncate px-3 font-mono text-[10px] font-semibold uppercase tracking-wide text-white">
                                  {t(`phase.${segment.key}`)}
                                </span>
                              )}
                              {!segment.disabled && segment.variance === "behind" && (
                                <AlertTriangle className="relative ml-auto mr-2 h-3.5 w-3.5 shrink-0 text-white drop-shadow" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={segment.disabled}
                              onClick={() => onEditDates(project.id, segment)}
                              title={dateTitle}
                              className={cn(
                                "relative flex flex-1 shrink-0 items-center justify-center border-l",
                                segment.disabled ? "border-veltol-fgMute/20" : "border-white/20 bg-black/10 hover:bg-black/20",
                              )}
                            >
                              <CalendarDays className={cn("h-3.5 w-3.5", segment.disabled ? "text-veltol-fgMute/50" : "text-white")} />
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
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
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label}: end date is before start date — click to fix`}
      className="absolute top-1/2 flex h-7 -translate-y-1/2 items-center justify-center gap-1 overflow-hidden rounded-full border border-dashed border-veltol-red/50 bg-veltol-red/10 font-mono text-[9px] font-semibold uppercase tracking-wide text-veltol-red transition-colors hover:bg-veltol-red/20"
      style={{ left: 0, width: "100%" }}
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
  return (
    <button
      type="button"
      disabled={segment.disabled}
      onClick={onClick}
      title={label}
      className={cn(
        "absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-full border border-dashed px-3 font-mono text-[9px] font-semibold uppercase tracking-wide transition-colors",
        segment.disabled
          ? "border-veltol-fgMute/20 bg-veltol-fgMute/5 text-veltol-fgMute/30 opacity-60"
          : "border-veltol-fgMute/40 bg-veltol-fgMute/5 text-veltol-fgMute/60 hover:border-veltol-primary/50 hover:bg-veltol-primary/10 hover:text-veltol-primary",
      )}
      style={{ left: 0, width: "100%" }}
    >
      {label}
    </button>
  );
}
