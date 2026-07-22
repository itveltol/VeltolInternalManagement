"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, X } from "lucide-react";
import type { Activity, MatrixCell, MatrixProject, ActivityStatus } from "../types";
import {
  projectCompletionPct,
  phaseCompletionPct,
  activityRowPct,
  isPhaseEnabled,
} from "../services/matriceService";
import { buildDerivedActivityIds } from "../services/checklistActivityMapping";
import { MatriceCell } from "./MatriceCell";
import { cn } from "@/shared/utils/cn";

interface Props {
  activities: Activity[];
  cells: MatrixCell[];
  projects: MatrixProject[];
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  onHideProject: (projectId: number) => void;
  docCounts?: Map<string, number>;
  pendingCells?: Set<string>;
}

export function MatriceGrid({ activities, cells, projects, onChangeStatus, onOpenDocuments, onHideProject, docCounts = new Map(), pendingCells }: Props) {
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
    for (const p of projects) map.set(p.id, projectCompletionPct(activities, cells, p.id, p));
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

  const derivedActivityIds = useMemo(() => buildDerivedActivityIds(activities), [activities]);

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
            <th className="sticky left-0 z-20 w-6 bg-card px-1" />
            {/* Sticky: activity col */}
            <th className="sticky left-6 z-20 min-w-[220px] bg-card px-3 py-2 text-left text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute">
              {t("grid.activity")}
            </th>
            {/* Sticky: row% col */}
            <th className="sticky left-[calc(1.5rem+220px)] z-20 w-12 bg-card px-2 py-2 text-center text-[11.5px] font-bold uppercase tracking-[.09em] text-veltol-fgMute tabular-nums">
              %
            </th>
            {/* Project columns */}
            {projects.map((p) => {
              const pct = projectPctById.get(p.id) ?? 0;
              return (
                <th
                  key={p.id}
                  className="group/col min-w-[140px] px-3 py-3 text-center"
                >
                  <div className="relative flex items-start justify-center">
                    <div>
                      <div className="text-[13px] font-bold text-veltol-fg">{p.name}</div>
                      {p.project_type && (
                        <div className="mt-0.5 text-[11px] font-medium text-veltol-fgMute">{p.project_type}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onHideProject(p.id)}
                      title={t("hideProject")}
                      className="absolute -right-1 -top-1 rounded p-0.5 text-veltol-faint opacity-0 transition-opacity hover:bg-[var(--v-danger-bg)] hover:text-veltol-red group-hover/col:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mx-auto mt-2 h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-[var(--v-line-2)]">
                    <div
                      className="h-full rounded-full bg-veltol-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-[12px] font-semibold tabular-nums text-veltol-primary">
                    {t("grid.pctComplete", { pct })}
                  </div>
                </th>
              );
            })}
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
                className="cursor-pointer select-none border-b border-border bg-veltol-surface/60 hover:bg-veltol-surface"
                onClick={() => togglePhase(phaseNo)}
              >
                {/* collapse arrow */}
                <td className="sticky left-0 z-10 bg-veltol-surface/60 px-1 py-2.5 text-center text-veltol-fgMute">
                  <ChevronRight
                    className={cn("inline-block h-3 w-3 transition-transform", !isCollapsed && "rotate-90")}
                  />
                </td>
                <td
                  colSpan={2}
                  className="sticky left-6 z-10 bg-veltol-surface/60 px-3 py-2.5 text-[13px] font-bold text-veltol-fg"
                >
                  {phaseNo}. {phaseName}
                </td>
                {projects.map((p) => {
                  const enabled = isPhaseEnabled(p, phaseNo);
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        "px-2 py-2.5 text-center text-[12px] font-semibold tabular-nums",
                        enabled ? "text-veltol-fgDim" : "text-veltol-faint",
                      )}
                      title={enabled ? undefined : t("grid.notContracted")}
                    >
                      {enabled ? `${phasePctByKey.get(`${phaseNo}:${p.id}`) ?? 0}%` : "—"}
                    </td>
                  );
                })}
              </tr>,

              // Activity rows for this phase (hidden when collapsed)
              ...(!isCollapsed
                ? phaseActivities.map((activity) => {
                    if (activity.is_section_header) {
                      return (
                        <tr
                          key={`activity-${activity.id}`}
                          className="border-b border-border bg-[var(--v-line-2)]"
                        >
                          <td className="sticky left-0 z-10 bg-[var(--v-line-2)]" />
                          <td
                            colSpan={2 + projects.length}
                            className="sticky left-6 z-10 bg-[var(--v-line-2)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.09em] text-veltol-fgMute"
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
                        className="border-b border-border hover:bg-[#F6F9FE]"
                      >
                        <td className="sticky left-0 z-10 bg-card" />
                        <td className="sticky left-6 z-10 bg-card px-3 py-2 text-[13px] font-medium text-veltol-fg">
                          <span className="mr-2 inline-block size-1.5 rounded-full bg-veltol-accent" />
                          {activity.name}
                        </td>
                        <td className="sticky left-[calc(1.5rem+220px)] z-10 bg-card px-2 py-2 text-center text-[12px] font-medium tabular-nums text-veltol-fgDim">
                          {rowPct}%
                        </td>
                        {projects.map((p) => {
                          const status = getStatus(p.id, activity.id);
                          const enabled = isPhaseEnabled(p, activity.phase_no);
                          const derived = derivedActivityIds.has(activity.id);
                          return (
                            <td
                              key={p.id}
                              className="px-1.5 py-1"
                              title={enabled && derived ? t("grid.derivedFromChecklist") : undefined}
                            >
                              {enabled ? (
                                <MatriceCell
                                  status={status}
                                  projectId={p.id}
                                  activityId={activity.id}
                                  onChangeStatus={onChangeStatus}
                                  onOpenDocuments={onOpenDocuments}
                                  documentCount={docCounts.get(`${p.id}:${activity.id}`) ?? 0}
                                  pending={pendingCells?.has(`${p.id}:${activity.id}`)}
                                  disabled={derived}
                                />
                              ) : (
                                <div
                                  className="flex h-7 w-full items-center justify-center rounded-full border border-dashed border-veltol-border text-veltol-faint"
                                  title={t("grid.notContracted")}
                                >
                                  —
                                </div>
                              )}
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
