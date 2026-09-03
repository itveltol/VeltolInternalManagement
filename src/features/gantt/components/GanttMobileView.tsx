"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CalendarDays, X } from "lucide-react";
import type { ProjectGanttRow, GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { cn } from "@/shared/utils/cn";
import { toDayMs } from "@/shared/utils/ganttTimeline";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle, DataCardSubtitle,
  DataCardBadgeSlot,
} from "@/shared/components/ui/data-card";

function hasValidRange(segment: GanttPhaseSegment): boolean {
  if (!segment.startDate || !segment.endDate) return false;
  return toDayMs(segment.endDate) >= toDayMs(segment.startDate);
}

interface Props {
  rows: ProjectGanttRow[];
  onNavigateToPhase: (projectId: number, segment: GanttPhaseSegment) => void;
  onEditDates: (projectId: number, segment: GanttPhaseSegment) => void;
  onHideProject: (projectId: number) => void;
  pagination?: ReactNode;
}

export function GanttMobileView({ rows, onNavigateToPhase, onEditDates, onHideProject, pagination }: Props) {
  const t = useTranslations("gantt");

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center text-sm text-veltol-fgMute">
        {t("emptyState")}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <DataCardList>
        {rows.map(({ project, segments }) => (
          <DataCard key={project.id}>
            <DataCardHeader>
              <div className="min-w-0">
                <DataCardTitle>{project.name}</DataCardTitle>
                <DataCardSubtitle>
                  {project.execution_mode === "subcontracted"
                    ? project.subcontractor?.name
                    : [project.manager?.first_name, project.manager?.last_name].filter(Boolean).join(" ")}
                  {project.project_type && (
                    <span className="ml-1.5 uppercase tracking-wide">{project.project_type}</span>
                  )}
                </DataCardSubtitle>
              </div>
              <DataCardBadgeSlot>
                <button
                  type="button"
                  onClick={() => onHideProject(project.id)}
                  title={t("hideProject")}
                  className="rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-red/10 hover:text-veltol-red"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </DataCardBadgeSlot>
            </DataCardHeader>

            <div className="divide-y divide-border/60 rounded-lg border border-border/60">
              {GANTT_PHASE_KEYS.map((key) => {
                const segment = segments.find((s) => s.key === key)!;
                const color = GANTT_PHASE_COLOR[segment.key];
                const isPlaceholder = !segment.startDate || !segment.endDate;
                const isInvalid = !isPlaceholder && !hasValidRange(segment);

                return (
                  <div key={key} className="flex items-center gap-2 px-3 py-2.5">
                    <span className={cn("size-2 shrink-0 rounded-full", color.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold uppercase tracking-wide text-veltol-fgDim">
                        {t(`phase.${key}`)}
                      </div>
                      {isPlaceholder ? (
                        <button
                          type="button"
                          disabled={segment.disabled}
                          onClick={() => onEditDates(project.id, segment)}
                          className="text-[12px] font-medium text-veltol-fgMute/70 disabled:opacity-40"
                        >
                          {segment.disabled ? t("notContracted") : t("notScheduled")}
                        </button>
                      ) : isInvalid ? (
                        <button
                          type="button"
                          onClick={() => onEditDates(project.id, segment)}
                          className="flex items-center gap-1 text-[12px] font-medium text-veltol-red"
                        >
                          <AlertTriangle className="size-3 shrink-0" /> {t("invalidRange")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={segment.disabled}
                          onClick={() => onNavigateToPhase(project.id, segment)}
                          className="flex flex-wrap items-center gap-1.5 text-left text-[12px] font-medium text-veltol-fgDim disabled:opacity-40"
                        >
                          <span className="tabular-nums">{segment.startDate} → {segment.endDate}</span>
                          {!segment.disabled && (
                            <>
                              <span className="tabular-nums text-veltol-fgMute">· {segment.pct}%</span>
                              {segment.variance === "behind" && (
                                <AlertTriangle className="size-3 shrink-0 text-veltol-orange" />
                              )}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    {!segment.disabled && (
                      <button
                        type="button"
                        onClick={() => onEditDates(project.id, segment)}
                        title={t(`phase.${key}`)}
                        className="shrink-0 rounded p-1.5 text-veltol-fgMute transition-colors hover:bg-veltol-surface/60 hover:text-veltol-fgDim"
                      >
                        <CalendarDays className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </DataCard>
        ))}
      </DataCardList>

      {pagination}
    </div>
  );
}
