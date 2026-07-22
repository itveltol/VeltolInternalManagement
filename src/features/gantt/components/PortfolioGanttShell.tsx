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
import { getGanttMatriceData, showGanttProject, unshowGanttProject } from "@/app/[locale]/(app)/gantt/actions";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";

const PAGE_SIZE = 5;

interface Props {
  allProjects: Project[];
  initialShownIds: number[];
  initialActivities: Activity[];
  initialCells: MatrixCell[];
  todayMs: number;
}

export function PortfolioGanttShell({ allProjects, initialShownIds, initialActivities, initialCells, todayMs }: Props) {
  const t = useTranslations("gantt");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shownIds, setShownIds] = useState<number[]>(initialShownIds);
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [cells, setCells] = useState<MatrixCell[]>(initialCells);
  const [editing, setEditing] = useState<{ projectId: number; segment: GanttPhaseSegment } | null>(null);

  const visibleIds = useMemo(
    () => allProjects.map((p) => p.id).filter((id) => shownIds.includes(id)),
    [allProjects, shownIds],
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

  const pickableProjects = useMemo(
    () => allProjects.filter((p) => !shownIds.includes(p.id)),
    [allProjects, shownIds],
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

  function handleRemove(projectId: number) {
    setShownIds((prev) => prev.filter((id) => id !== projectId));
    startTransition(async () => {
      await unshowGanttProject(projectId);
    });
  }

  function handleAdd(projectId: number) {
    if (shownIds.length >= MAX_VISIBLE_PROJECTS) return;
    setShownIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    startTransition(async () => {
      const result = await showGanttProject(projectId);
      if (result?.error) {
        setShownIds((prev) => prev.filter((id) => id !== projectId));
      }
    });
  }

  const editingProject = editing ? allProjects.find((p) => p.id === editing.projectId) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-veltol-surface/30 p-4">
        <GanttProjectPicker
          pickableProjects={pickableProjects}
          onAdd={handleAdd}
          disabled={shownIds.length >= MAX_VISIBLE_PROJECTS}
          maxProjects={MAX_VISIBLE_PROJECTS}
          shownCount={shownIds.length}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {GANTT_PHASE_KEYS.map((key) => (
            <span
              key={key}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-veltol-fgDim"
            >
              <span className={`h-2 w-2 rounded-full ${GANTT_PHASE_COLOR[key].dot}`} />
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
        onHideProject={handleRemove}
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
