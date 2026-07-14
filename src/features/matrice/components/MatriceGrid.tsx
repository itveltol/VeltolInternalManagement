"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { Activity, MatrixCell, MatrixProject, ActivityStatus } from "../types";
import {
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
  pendingCells?: Set<string>;
}

export function MatriceGrid({ activities, cells, projects, onChangeStatus, onOpenDocuments, docCounts = new Map(), pendingCells }: Props) {
  const t = useTranslations("matrice");

  const phases = useMemo(
    () =>
      Array.from(
        new Map(activities.map((a) => [a.phase_no, a.phase_name])).entries(),
      ).sort((a, b) => a[0] - b[0]),
    [activities],
  );

  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const togglePhase = useCallback((phaseNo: number) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.has(phaseNo) ? next.delete(phaseNo) : next.add(phaseNo);
      return next;
    });
  }, []);

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  // Precompute per-cell status and all completion percentages once per data
  // change instead of re-scanning `cells`/`activities` inline during render.
  const statusByKey = useMemo(() => {
    const map = new Map<string, ActivityStatus>();
    for (const c of cells) map.set(`${c.project_id}:${c.activity_id}`, c.status);
    return map;
  }, [cells]);

  const getStatus = useCallback(
    (projectId: number, activityId: number) =>
      statusByKey.get(`${projectId}:${activityId}`) ?? "neinceput",
    [statusByKey],
  );

  const projectPctById = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of projects) map.set(p.id, projectCompletionPct(activities, cells, p.id));
    return map;
  }, [activities, cells, projects]);

  const phasePctByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const [phaseNo] of phases) {
      for (const p of projects) {
        map.set(`${phaseNo}:${p.id}`, phaseCompletionPct(activities, cells, p.id, phaseNo));
      }
    }
    return map;
  }, [activities, cells, projects, phases]);

  const activityRowPctById = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of activities) {
      if (a.is_section_header) continue;
      map.set(a.id, activityRowPct(cells, a.id, projectIds));
    }
    return map;
  }, [activities, cells, projectIds]);

  const activitiesByPhase = useMemo(() => {
    const map = new Map<number, Activity[]>();
    for (const a of activities) {
      const list = map.get(a.phase_no);
      if (list) list.push(a);
      else map.set(a.phase_no, [a]);
    }
    return map;
  }, [activities]);

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
          <tr className="border-b border-border">
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
                <div className="mt-1 font-mono text-[11px] tabular-nums text-veltol-accent">
                  {projectPctById.get(p.id) ?? 0}%
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {phases.map(([phaseNo, phaseName]) => {
            const phaseActivities = activitiesByPhase.get(phaseNo) ?? [];
            const isCollapsed = collapsedPhases.has(phaseNo);

            return [
              // Phase header row
              <tr
                key={`phase-${phaseNo}`}
                className="cursor-pointer select-none border-b border-border bg-veltol-surface/30 hover:bg-veltol-surface/50"
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
                    {phasePctByKey.get(`${phaseNo}:${p.id}`) ?? 0}%
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
                          className="border-b border-border bg-veltol-surface/10"
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

                    const rowPct = activityRowPctById.get(activity.id) ?? 0;

                    return (
                      <tr
                        key={`activity-${activity.id}`}
                        className="border-b border-border hover:bg-veltol-surface/20"
                      >
                        <td className="sticky left-0 z-10 bg-veltol-bg" />
                        <td className="sticky left-6 z-10 bg-veltol-bg px-3 py-1.5 text-[12px] text-veltol-fg/80">
                          {activity.name}
                        </td>
                        <td className="sticky left-[calc(1.5rem+220px)] z-10 bg-veltol-bg px-2 py-1.5 text-center font-mono text-[11px] tabular-nums text-veltol-fgDim">
                          {rowPct}%
                        </td>
                        {projects.map((p) => {
                          const status = getStatus(p.id, activity.id);
                          return (
                            <td key={p.id} className="px-1.5 py-1">
                              <MatriceCell
                                status={status}
                                projectId={p.id}
                                activityId={activity.id}
                                onChangeStatus={onChangeStatus}
                                onOpenDocuments={onOpenDocuments}
                                documentCount={docCounts.get(`${p.id}:${activity.id}`) ?? 0}
                                pending={pendingCells?.has(`${p.id}:${activity.id}`)}
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
