"use client";

import { useMemo, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, X } from "lucide-react";
import type { Activity, ActivityDependency, MatricePhase, MatrixCell, MatrixProject, ActivityStatus } from "../types";
import { projectCompletionPct, phaseCompletionPct, isPhaseEnabled, getUnmetDependencyNames } from "../services/matriceService";
import { MatriceCell } from "./MatriceCell";
import { cn } from "@/shared/utils/cn";

interface Props {
  activities: Activity[];
  phases: MatricePhase[];
  cells: MatrixCell[];
  projects: MatrixProject[];
  dependencies?: ActivityDependency[];
  selectedProjectId: number;
  onSelectProject: (projectId: number) => void;
  onChangeStatus: (projectId: number, activityId: number, status: ActivityStatus, expiresAt?: string | null) => void;
  onOpenDocuments: (projectId: number, activityId: number) => void;
  onOpenDiscussion: (projectId: number, activityId: number) => void;
  onHideProject: (projectId: number) => void;
  docCounts?: Map<string, number>;
  discussionCounts?: Map<string, number>;
  pendingCells?: Set<string>;
}

export function MatriceMobileView({
  activities, phases, cells, projects, dependencies = [], selectedProjectId, onSelectProject,
  onChangeStatus, onOpenDocuments, onOpenDiscussion, onHideProject, docCounts = new Map(), discussionCounts = new Map(), pendingCells,
}: Props) {
  const t = useTranslations("matrice");

  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => a.sort_order - b.sort_order).map((p): [number, string] => [p.id, p.name]),
    [phases],
  );

  const phaseById = useMemo(() => new Map(phases.map((p) => [p.id, p])), [phases]);

  const activitiesByPhase = useMemo(() => {
    const map = new Map<number, Activity[]>();
    for (const a of activities) {
      const list = map.get(a.phase_id);
      if (list) list.push(a);
      else map.set(a.phase_id, [a]);
    }
    return map;
  }, [activities]);

  const [collapsedPhases, setCollapsedPhases] = useState<Set<number>>(new Set());

  const togglePhase = useCallback((phaseNo: number) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      next.has(phaseNo) ? next.delete(phaseNo) : next.add(phaseNo);
      return next;
    });
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0];

  const getStatus = useCallback(
    (activityId: number): ActivityStatus =>
      cells.find((c) => c.project_id === selectedProject?.id && c.activity_id === activityId)?.status ?? "neinceput",
    [cells, selectedProject?.id],
  );

  const getExpiresAt = useCallback(
    (activityId: number): string | null =>
      cells.find((c) => c.project_id === selectedProject?.id && c.activity_id === activityId)?.expires_at ?? null,
    [cells, selectedProject?.id],
  );

  const getUnmetDependencyNamesFor = useCallback(
    (activityId: number): string[] =>
      selectedProject ? getUnmetDependencyNames(activities, dependencies, cells, selectedProject.id, activityId) : [],
    [activities, dependencies, cells, selectedProject],
  );

  if (projects.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-veltol-fgMute">
        {t("grid.noProjects")}
      </div>
    );
  }

  if (!selectedProject) return null;

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto border-b border-border p-3">
        {projects.map((p) => {
          const pct = projectCompletionPct(activities, phaseById, cells, p.id, p);
          const isSelected = p.id === selectedProject.id;
          return (
            <div
              key={p.id}
              className={cn(
                "flex shrink-0 items-start gap-1.5 rounded-lg border pl-3 pr-1.5 py-2 transition-colors",
                isSelected
                  ? "border-veltol-accent/40 bg-veltol-tint"
                  : "border-border bg-transparent hover:bg-veltol-surface/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectProject(p.id)}
                className="flex flex-col items-start gap-1 text-left"
              >
                <span className={cn("text-[13px] font-semibold", isSelected ? "text-veltol-primary" : "text-veltol-fg")}>
                  {p.name}
                </span>
                <span className="text-[11px] font-medium tabular-nums text-veltol-fgMute">
                  {t("grid.pctComplete", { pct })}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onHideProject(p.id)}
                title={t("hideProject")}
                className="shrink-0 self-start rounded p-1 text-veltol-fgMute transition-colors hover:bg-veltol-red/10 hover:text-veltol-red"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="divide-y divide-border">
        {sortedPhases.map(([phaseId, phaseName]) => {
          const phaseActivities = activitiesByPhase.get(phaseId) ?? [];
          const isCollapsed = collapsedPhases.has(phaseId);
          const phase = phaseById.get(phaseId);
          const enabled = !phase || isPhaseEnabled(selectedProject, phase);
          const pct = phaseCompletionPct(activities, cells, selectedProject.id, phaseId);

          return (
            <div key={phaseId}>
              <button
                type="button"
                onClick={() => togglePhase(phaseId)}
                className="flex w-full items-center gap-2 bg-veltol-surface/60 px-4 py-2.5 text-left hover:bg-veltol-surface"
              >
                <ChevronRight
                  className={cn("size-3.5 shrink-0 text-veltol-fgMute transition-transform", !isCollapsed && "rotate-90")}
                />
                <span className="flex-1 text-[13px] font-bold text-veltol-fg">{phaseName}</span>
                <span
                  className={cn(
                    "text-[12px] font-semibold tabular-nums",
                    enabled ? "text-veltol-fgDim" : "text-veltol-faint",
                  )}
                  title={enabled ? undefined : t("grid.notContracted")}
                >
                  {enabled ? `${pct}%` : "—"}
                </span>
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-border">
                  {phaseActivities.map((activity) => {
                    if (activity.is_section_header) {
                      return (
                        <div
                          key={activity.id}
                          className="bg-[var(--v-line-2)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[.09em] text-veltol-fgMute"
                        >
                          {activity.name}
                        </div>
                      );
                    }

                    const appliesToProject =
                      activity.applies_to === null ||
                      (selectedProject.project_type !== null && activity.applies_to.includes(selectedProject.project_type));

                    return (
                      <div key={activity.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="flex min-w-0 items-center text-[13px] font-medium text-veltol-fg">
                          <span className="mr-2 inline-block size-1.5 shrink-0 rounded-full bg-veltol-accent" />
                          <span className="truncate">{activity.name}</span>
                        </span>
                        {enabled ? (
                          <MatriceCell
                            status={getStatus(activity.id)}
                            projectId={selectedProject.id}
                            activityId={activity.id}
                            activityName={activity.name}
                            expiresRequired={activity.expires_required}
                            expiresAt={getExpiresAt(activity.id)}
                            unmetDependencyNames={getUnmetDependencyNamesFor(activity.id)}
                            onChangeStatus={onChangeStatus}
                            onOpenDocuments={onOpenDocuments}
                            onOpenDiscussion={onOpenDiscussion}
                            documentCount={docCounts.get(`${selectedProject.id}:${activity.id}`) ?? 0}
                            discussionCount={discussionCounts.get(`${selectedProject.id}:${activity.id}`) ?? 0}
                            pending={pendingCells?.has(`${selectedProject.id}:${activity.id}`)}
                            disabled={!appliesToProject}
                          />
                        ) : (
                          <div
                            className="flex h-7 shrink-0 items-center justify-center rounded-full border border-dashed border-veltol-border px-3 text-veltol-faint"
                            title={t("grid.notContracted")}
                          >
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
