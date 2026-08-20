"use client";

import { useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, X } from "lucide-react";
import type { Activity, ActivityDependency, MatricePhase, MatrixCell, MatrixProject, ActivityStatus } from "../types";
import {
  projectCompletionPct,
  phaseCompletionPct,
  activityRowPct,
  isPhaseEnabled,
  getUnmetDependencyNames,
} from "../services/matriceService";
import { MatriceCell } from "./MatriceCell";
import { cn } from "@/shared/utils/cn";

interface Props {
  activities: Activity[];
  phases: MatricePhase[];
  cells: MatrixCell[];
  projects: MatrixProject[];
  dependencies?: ActivityDependency[];
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus, expiresAt?: string | null) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  onOpenDiscussion: (projectId: number, activityId: number) => void;
  onHideProject: (projectId: number) => void;
  docCounts?: Map<string, number>;
  discussionCounts?: Map<string, number>;
  pendingCells?: Set<string>;
}

export function MatriceGrid({ activities, phases, cells, projects, dependencies = [], onChangeStatus, onOpenDocuments, onOpenDiscussion, onHideProject, docCounts = new Map(), discussionCounts = new Map(), pendingCells }: Props) {
  const t = useTranslations("matrice");

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.sort_order - b.sort_order).map((p): [number, string] => [p.id, p.name]),
    [phases],
  );

  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);

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

  const expiresAtByKey = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of cells) map.set(`${c.project_id}:${c.activity_id}`, c.expires_at);
    return map;
  }, [cells]);

  const getExpiresAt = useCallback(
    (projectId: number, activityId: number) =>
      expiresAtByKey.get(`${projectId}:${activityId}`) ?? null,
    [expiresAtByKey],
  );

  const getUnmetDependencyNamesFor = useCallback(
    (projectId: number, activityId: number) =>
      getUnmetDependencyNames(activities, dependencies, cells, projectId, activityId),
    [activities, dependencies, cells],
  );

  const projectPctById = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of projects) map.set(p.id, projectCompletionPct(activities, phaseById, cells, p.id, p));
    return map;
  }, [activities, phaseById, cells, projects]);

  const phasePctByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const [phaseId] of sortedPhases) {
      for (const p of projects) {
        map.set(`${phaseId}:${p.id}`, phaseCompletionPct(activities, cells, p.id, phaseId));
      }
    }
    return map;
  }, [activities, cells, projects, sortedPhases]);

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
      const list = map.get(a.phase_id);
      if (list) list.push(a);
      else map.set(a.phase_id, [a]);
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
          {sortedPhases.map(([phaseId, phaseName]) => {
            const phaseActivities = activitiesByPhase.get(phaseId) ?? [];
            const isCollapsed = collapsedPhases.has(phaseId);

            return [
              // Phase header row
              <tr
                key={`phase-${phaseId}`}
                className="cursor-pointer select-none border-b border-border bg-veltol-surface/60 hover:bg-veltol-surface"
                onClick={() => togglePhase(phaseId)}
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
                  {phaseName}
                </td>
                {projects.map((p) => {
                  const phase = phaseById.get(phaseId);
                  const enabled = !phase || isPhaseEnabled(p, phase);
                  return (
                    <td
                      key={p.id}
                      className={cn(
                        "px-2 py-2.5 text-center text-[12px] font-semibold tabular-nums",
                        enabled ? "text-veltol-fgDim" : "text-veltol-faint",
                      )}
                      title={enabled ? undefined : t("grid.notContracted")}
                    >
                      {enabled ? `${phasePctByKey.get(`${phaseId}:${p.id}`) ?? 0}%` : "—"}
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
                        className="border-b border-border hover:bg-veltol-hover"
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
                          const activityPhase = phaseById.get(activity.phase_id);
                          const enabled = !activityPhase || isPhaseEnabled(p, activityPhase);
                          const appliesToProject =
                            activity.applies_to === null ||
                            (p.project_type !== null && activity.applies_to.includes(p.project_type));
                          return (
                            <td
                              key={p.id}
                              className="px-1.5 py-1"
                              title={enabled && !appliesToProject ? t("grid.notApplicable") : undefined}
                            >
                              {enabled ? (
                                <MatriceCell
                                  status={status}
                                  projectId={p.id}
                                  activityId={activity.id}
                                  activityName={activity.name}
                                  expiresRequired={activity.expires_required}
                                  expiresAt={getExpiresAt(p.id, activity.id)}
                                  unmetDependencyNames={getUnmetDependencyNamesFor(p.id, activity.id)}
                                  onChangeStatus={onChangeStatus}
                                  onOpenDocuments={onOpenDocuments}
                                  onOpenDiscussion={onOpenDiscussion}
                                  documentCount={docCounts.get(`${p.id}:${activity.id}`) ?? 0}
                                  discussionCount={discussionCounts.get(`${p.id}:${activity.id}`) ?? 0}
                                  pending={pendingCells?.has(`${p.id}:${activity.id}`)}
                                  disabled={!appliesToProject}
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
