"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Project } from "@/features/projects/types";
import type { Activity, MatrixCell } from "@/features/matrice/types";
import type { GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { buildProjectGanttRows } from "../services/ganttPhaseService";
import { GanttProjectPicker } from "./GanttProjectPicker";
import { PortfolioGanttChart } from "./PortfolioGanttChart";
import { PhaseDateDialog } from "./PhaseDateDialog";
import { Pagination } from "@/shared/components/ui/pagination";
import { getGanttMatriceData, hideGanttProject, unhideGanttProject } from "@/app/[locale]/(app)/gantt/actions";

const PAGE_SIZE = 5;

interface Props {
  allProjects: Project[];
  initialHiddenIds: number[];
  initialActivities: Activity[];
  initialCells: MatrixCell[];
  todayMs: number;
}

export function PortfolioGanttShell({ allProjects, initialHiddenIds, initialActivities, initialCells, todayMs }: Props) {
  const t = useTranslations("gantt");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [hiddenIds, setHiddenIds] = useState<number[]>(initialHiddenIds);
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [cells, setCells] = useState<MatrixCell[]>(initialCells);
  const [editing, setEditing] = useState<{ projectId: number; segment: GanttPhaseSegment } | null>(null);

  const visibleIds = useMemo(
    () => allProjects.map((p) => p.id).filter((id) => !hiddenIds.includes(id)),
    [allProjects, hiddenIds],
  );

  const isFirstDataLoad = useRef(true);
  useEffect(() => {
    if (isFirstDataLoad.current) {
      isFirstDataLoad.current = false;
      return;
    }
    startTransition(async () => {
      const fresh = await getGanttMatriceData(visibleIds);
      setActivities(fresh.activities);
      setCells(fresh.cells);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  const visibleProjects = useMemo(
    () => allProjects.filter((p) => visibleIds.includes(p.id)),
    [allProjects, visibleIds],
  );

  const hiddenProjects = useMemo(
    () => allProjects.filter((p) => hiddenIds.includes(p.id)),
    [allProjects, hiddenIds],
  );

  const pageCount = Math.max(1, Math.ceil(visibleProjects.length / PAGE_SIZE));
  // Clamp to the last page if hiding/unhiding projects shrinks the page
  // count (derived during render, not an effect).
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);

  const pageProjects = useMemo(
    () => visibleProjects.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [visibleProjects, currentPage],
  );

  const rows = useMemo(
    () => buildProjectGanttRows(pageProjects, activities, cells, todayMs),
    [pageProjects, activities, cells, todayMs],
  );

  function handleHide(projectId: number) {
    setHiddenIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    startTransition(async () => {
      await hideGanttProject(projectId);
    });
  }

  function handleUnhide(projectId: number) {
    setHiddenIds((prev) => prev.filter((id) => id !== projectId));
    startTransition(async () => {
      await unhideGanttProject(projectId);
    });
  }

  const editingProject = editing ? allProjects.find((p) => p.id === editing.projectId) ?? null : null;

  return (
    <div className="space-y-6">
      {hiddenProjects.length > 0 && (
        <div className="rounded-xl border border-border bg-veltol-surface/30 p-4">
          <GanttProjectPicker hiddenProjects={hiddenProjects} onUnhide={handleUnhide} />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {GANTT_PHASE_KEYS.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-veltol-fgMute"
            >
              <span className={`h-2.5 w-2.5 rounded-sm ${GANTT_PHASE_COLOR[key].line}`} />
              {t(`phase.${key}`)}
            </span>
          ))}
        </div>
        {isPending && <span className="font-mono text-[10px] text-veltol-fgMute">{t("loading")}</span>}
      </div>

      <PortfolioGanttChart
        rows={rows}
        todayMs={todayMs}
        onSegmentClick={(projectId, segment) => setEditing({ projectId, segment })}
        onHideProject={handleHide}
        pagination={
          <Pagination
            page={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            prevLabel={t("pagination.prev")}
            nextLabel={t("pagination.next")}
            pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
          />
        }
      />

      {editing && editingProject && (
        <PhaseDateDialog
          project={editingProject}
          phaseKey={editing.segment.key}
          open
          onClose={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
