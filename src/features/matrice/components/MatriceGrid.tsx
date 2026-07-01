"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Activity, MatrixCell, MatrixProject, ActivityStatus } from "../types";
import {
  resolveStatus,
  projectCompletionPct,
  phaseCompletionPct,
  activityRowPct,
} from "../services/matriceService";
import { MatriceCell } from "./MatriceCell";
import { cn } from "@/shared/utils/cn";

interface Props {
  activities: Activity[];
  cells: MatrixCell[];
  projects: MatrixProject[];
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  docCounts?: Map<string, number>;
}

export function MatriceGrid({ activities, cells, projects, onChangeStatus, onOpenDocuments, docCounts = new Map() }: Props) {
  const t = useTranslations("matrice");

  const phases = Array.from(
    new Map(activities.map((a) => [a.phase_no, a.phase_name])).entries(),
  ).sort((a, b) => a[0] - b[0]);

  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  function togglePhase(phaseNo: number) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.has(phaseNo) ? next.delete(phaseNo) : next.add(phaseNo);
      return next;
    });
  }

  const projectIds = projects.map((p) => p.id);

  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-veltol-fgMute">
        {t("grid.noProjects")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.07]">
            {/* Sticky: phase col */}
            <th className="sticky left-0 z-20 w-6 bg-veltol-bg px-1" />
            {/* Sticky: activity col */}
            <th className="sticky left-6 z-20 min-w-[220px] bg-veltol-bg px-3 py-2 text-left font-mono text-[9px] uppercase tracking-[0.15em] text-veltol-fgMute">
              {t("grid.activity")}
            </th>
            {/* Sticky: row% col */}
            <th className="sticky left-[calc(1.5rem+220px)] z-20 w-12 bg-veltol-bg px-2 py-2 text-center font-mono text-[9px] uppercase tracking-[0.15em] text-veltol-fgMute tabular-nums">
              %
            </th>
            {/* Project columns */}
            {projects.map((p) => (
              <th
                key={p.id}
                className="min-w-[120px] px-2 py-2 text-center"
              >
                <div className="text-[12px] font-semibold text-veltol-fg">{p.name}</div>
                {p.project_type && (
                  <div className="mt-0.5 font-mono text-[9px] text-veltol-fgMute">{p.project_type}</div>
                )}
                <div className="mt-1 font-mono text-[11px] tabular-nums text-veltol-aqua">
                  {projectCompletionPct(activities, cells, p.id)}%
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.map(([phaseNo, phaseName]) => {
            const phaseActivities = activities.filter((a) => a.phase_no === phaseNo);
            const isCollapsed = collapsedPhases.has(phaseNo);

            return [
              // Phase header row
              <tr
                key={`phase-${phaseNo}`}
                className="cursor-pointer select-none border-b border-white/[0.04] bg-veltol-surface/30 hover:bg-veltol-surface/50"
                onClick={() => togglePhase(phaseNo)}
              >
                {/* collapse arrow */}
                <td className="sticky left-0 z-10 bg-veltol-surface/30 px-1 py-2 text-center text-veltol-fgMute">
                  <span className={cn("inline-block text-[10px] transition-transform", isCollapsed ? "" : "rotate-90")}>
                    ▶
                  </span>
                </td>
                <td
                  colSpan={2}
                  className="sticky left-6 z-10 bg-veltol-surface/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-veltol-fgMute"
                >
                  {phaseNo}. {phaseName}
                </td>
                {projects.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center font-mono text-[11px] tabular-nums text-veltol-fgDim">
                    {phaseCompletionPct(activities, cells, p.id, phaseNo)}%
                  </td>
                ))}
              </tr>,

              // Activity rows for this phase (hidden when collapsed)
              ...(!isCollapsed
                ? phaseActivities.map((activity) => {
                    if (activity.is_section_header) {
                      return (
                        <tr
                          key={`activity-${activity.id}`}
                          className="border-b border-white/[0.04] bg-veltol-surface/10"
                        >
                          <td className="sticky left-0 z-10 bg-veltol-surface/10" />
                          <td
                            colSpan={2 + projects.length}
                            className="sticky left-6 z-10 bg-veltol-surface/10 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-veltol-fg/60"
                          >
                            {activity.name}
                          </td>
                        </tr>
                      );
                    }

                    const rowPct = activityRowPct(cells, activity.id, projectIds);

                    return (
                      <tr
                        key={`activity-${activity.id}`}
                        className="border-b border-white/[0.04] hover:bg-veltol-surface/20"
                      >
                        <td className="sticky left-0 z-10 bg-veltol-bg" />
                        <td className="sticky left-6 z-10 bg-veltol-bg px-3 py-1.5 text-[12px] text-veltol-fg/80">
                          {activity.name}
                        </td>
                        <td className="sticky left-[calc(1.5rem+220px)] z-10 bg-veltol-bg px-2 py-1.5 text-center font-mono text-[11px] tabular-nums text-veltol-fgDim">
                          {rowPct}%
                        </td>
                        {projects.map((p) => {
                          const status = resolveStatus(cells, p.id, activity.id);
                          return (
                            <td key={p.id} className="px-1.5 py-1">
                              <MatriceCell
                                status={status}
                                projectId={p.id}
                                activityId={activity.id}
                                onChangeStatus={onChangeStatus}
                                onOpenDocuments={() => onOpenDocuments(p.id, activity.id)}
                                documentCount={docCounts.get(`${p.id}:${activity.id}`) ?? 0}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                : []),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
