"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Project, ProjectManager } from "@/features/projects/types";
import type { Activity, MatricePhase, MatrixCell } from "@/features/matrice/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";
import type { GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { buildProjectGanttRows } from "../services/ganttPhaseService";
import { GanttProjectPicker } from "./GanttProjectPicker";
import { PortfolioGanttChart } from "./PortfolioGanttChart";
import { GanttMobileView } from "./GanttMobileView";
import { PhaseDateDialog } from "./PhaseDateDialog";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterMultiDropdown } from "@/shared/components/ui/filter-field";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { getGanttMatriceData, showGanttProject, unshowGanttProject } from "@/app/[locale]/(app)/gantt/actions";
import { pinMatriceProject } from "@/app/[locale]/(app)/matrice-status/actions";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";

const PAGE_SIZE = 5;

interface Props {
  allProjects: Project[];
  managers: ProjectManager[];
  initialShownIds: number[];
  initialActivities: Activity[];
  initialPhases: MatricePhase[];
  initialCells: MatrixCell[];
  initialChecklistRecordsByProjectId: Record<number, ChecklistItemRecord[]>;
  todayMs: number;
}

export function PortfolioGanttShell({
  allProjects,
  managers,
  initialShownIds,
  initialActivities,
  initialPhases,
  initialCells,
  initialChecklistRecordsByProjectId,
  todayMs,
}: Props) {
  const t = useTranslations("gantt");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [shownIds, setShownIds] = useState<number[]>(initialShownIds);
  const [filterManagerIds, setFilterManagerIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [phases, setPhases] = useState<MatricePhase[]>(initialPhases);
  const [cells, setCells] = useState<MatrixCell[]>(initialCells);
  const [checklistRecordsByProjectId, setChecklistRecordsByProjectId] = useState<Record<number, ChecklistItemRecord[]>>(
    initialChecklistRecordsByProjectId,
  );
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
      setPhases(fresh.phases);
      setCells(fresh.cells);
      setChecklistRecordsByProjectId(fresh.checklistRecordsByProjectId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  const visibleProjects = useMemo(
    () => allProjects.filter((p) => visibleIds.includes(p.id)),
    [allProjects, visibleIds],
  );

  const pickableProjects = useMemo(
    () =>
      allProjects.filter(
        (p) =>
          !shownIds.includes(p.id) &&
          (filterManagerIds.length === 0 || (p.manager_id && filterManagerIds.includes(p.manager_id))),
      ),
    [allProjects, shownIds, filterManagerIds],
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
    () => buildProjectGanttRows(pageProjects, activities, phases, cells, todayMs, checklistRecordsByProjectId),
    [pageProjects, activities, phases, cells, todayMs, checklistRecordsByProjectId],
  );

  // Timeline bounds must reflect every currently-shown project, not just the
  // page being rendered — otherwise hiding a project on another page leaves
  // the header's month range stuck (or shifts it for the wrong reason).
  const rangeRows = useMemo(
    () => buildProjectGanttRows(visibleProjects, activities, phases, cells, todayMs, checklistRecordsByProjectId),
    [visibleProjects, activities, phases, cells, todayMs, checklistRecordsByProjectId],
  );

  function handleRemove(projectId: number) {
    setShownIds((prev) => prev.filter((id) => id !== projectId));
    startTransition(async () => {
      await unshowGanttProject(projectId);
    });
  }

  async function handleFilterManagerIds(nextManagerIds: string[]) {
    if (nextManagerIds.length > 0) {
      const shownProjects = allProjects.filter((p) => shownIds.includes(p.id));
      const nonMatching = shownProjects.filter(
        (p) => !p.manager_id || !nextManagerIds.includes(p.manager_id),
      );
      if (nonMatching.length > 0) {
        const remove = await confirm({
          title: t("filters.removeNonMatchingTitle"),
          description: t("filters.removeNonMatchingDescription", { count: nonMatching.length }),
          confirmLabel: t("filters.removeNonMatchingConfirm"),
          cancelLabel: t("filters.removeNonMatchingCancel"),
        });
        if (remove) {
          for (const p of nonMatching) handleRemove(p.id);
        }
      }
    }
    setFilterManagerIds(nextManagerIds);
  }

  function handleAdd(projectId: number) {
    if (shownIds.length >= MAX_VISIBLE_PROJECTS) return;
    setShownIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    startTransition(async () => {
      const result = await showGanttProject(projectId);
      if (result?.error) {
        setShownIds((prev) => prev.filter((id) => id !== projectId));
        toast.error(result.error === "errorMaxProjects" ? t("errorMaxProjects") : t("errorGeneric"));
      }
    });
  }

  const editingProject = editing ? allProjects.find((p) => p.id === editing.projectId) ?? null : null;

  function handleNavigateToPhase(projectId: number) {
    startTransition(async () => {
      await pinMatriceProject(projectId);
      router.push("/matrice-status");
    });
  }

  function renderPagination() {
    return (
      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        prevLabel={t("pagination.prev")}
        nextLabel={t("pagination.next")}
        pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-veltol-surface/30 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <GanttProjectPicker
            pickableProjects={pickableProjects}
            onAdd={handleAdd}
            disabled={shownIds.length >= MAX_VISIBLE_PROJECTS}
            maxProjects={MAX_VISIBLE_PROJECTS}
            shownCount={shownIds.length}
          />
        </div>
        <FilterField label={t("filters.manager")} htmlFor="gantt-filter-manager" className="shrink-0">
          <FilterMultiDropdown
            id="gantt-filter-manager"
            value={filterManagerIds}
            onChange={handleFilterManagerIds}
            allLabel={t("filterAllManagers")}
            options={managers.map((m) => ({
              value: m.id,
              label: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim(),
            }))}
          />
        </FilterField>
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

      <div className="hidden md:block">
        <PortfolioGanttChart
          rows={rows}
          rangeRows={rangeRows}
          todayMs={todayMs}
          onNavigateToPhase={(projectId) => handleNavigateToPhase(projectId)}
          onEditDates={(projectId, segment) => setEditing({ projectId, segment })}
          onHideProject={handleRemove}
          pagination={renderPagination()}
        />
      </div>

      <div className="md:hidden">
        <GanttMobileView
          rows={rows}
          onNavigateToPhase={(projectId) => handleNavigateToPhase(projectId)}
          onEditDates={(projectId, segment) => setEditing({ projectId, segment })}
          onHideProject={handleRemove}
          pagination={renderPagination()}
        />
      </div>

      {editing && editingProject && (
        <PhaseDateDialog
          project={editingProject}
          phaseKey={editing.segment.key}
          segment={editing.segment}
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
