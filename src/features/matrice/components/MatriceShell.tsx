"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MatrixData, MatrixProject, MatrixCell, ActivityStatus } from "../types";
import { MatriceProjectPicker } from "./MatriceProjectPicker";
import { MatriceGrid } from "./MatriceGrid";
import { MatriceLegend } from "./MatriceLegend";
import { DocumentsPopover } from "@/features/documents/components/DocumentsPopover";
import {
  setCellStatus,
  getMatrixData,
  showMatriceProject,
  unshowMatriceProject,
} from "@/app/[locale]/(app)/matrice-status/actions";
import { MAX_VISIBLE_PROJECTS } from "@/features/hiddenProjects/constants";
import { getDocuments } from "@/app/[locale]/(app)/documents/actions";

interface Props {
  initialData: MatrixData;
  allProjects: MatrixProject[];
  initialShownIds: number[];
}

export function MatriceShell({ initialData, allProjects, initialShownIds }: Props) {
  const t = useTranslations("matrice");
  const [isPending, startTransition] = useTransition();

  const [shownIds, setShownIds] = useState<number[]>(initialShownIds);
  const [data, setData] = useState<MatrixData>(initialData);
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
  const [docsPopover, setDocsPopover] = useState<{ projectId: number; activityId: number } | null>(null);
  const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(
    () => allProjects.map((p) => p.id).filter((id) => shownIds.includes(id)),
    [allProjects, shownIds],
  );

  const pickableProjects = useMemo(
    () => allProjects.filter((p) => !shownIds.includes(p.id)),
    [allProjects, shownIds],
  );

  // Reload matrix when the visible set changes (skip the very first run —
  // the server already fetched `initialData` for all projects).
  const isFirstDataLoad = useRef(true);
  useEffect(() => {
    if (isFirstDataLoad.current) {
      isFirstDataLoad.current = false;
      return;
    }
    startTransition(async () => {
      const fresh = await getMatrixData(visibleIds);
      setData(fresh);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  // Load document counts for matrice cells whenever the visible set changes
  useEffect(() => {
    if (visibleIds.length === 0) { setDocCounts(new Map()); return; }
    startTransition(async () => {
      const docs = await getDocuments({ linked_type: "matrice_cell" });
      const counts = new Map<string, number>();
      for (const doc of docs) {
        const [pIdStr] = doc.linked_id.split(":");
        if (visibleIds.includes(Number(pIdStr))) {
          counts.set(doc.linked_id, (counts.get(doc.linked_id) ?? 0) + 1);
        }
      }
      setDocCounts(counts);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  function handleRemoveProject(projectId: number) {
    setShownIds((prev) => prev.filter((id) => id !== projectId));
    startTransition(async () => {
      await unshowMatriceProject(projectId);
    });
  }

  function handleAddProject(projectId: number) {
    if (shownIds.length >= MAX_VISIBLE_PROJECTS) return;
    setShownIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    startTransition(async () => {
      const result = await showMatriceProject(projectId);
      if (result?.error) {
        // Server rejected it (cap reached elsewhere/race): roll back optimistic add.
        setShownIds((prev) => prev.filter((id) => id !== projectId));
      }
    });
  }

  function handleOpenDocuments(projectId: number, activityId: number) {
    setDocsPopover({ projectId, activityId });
  }

  function handleChangeStatus(projectId: number, activityId: number, status: ActivityStatus) {
    const cellKey = `${projectId}:${activityId}`;

    // Optimistic update
    setData((prev) => {
      const cells: MatrixCell[] = prev.cells.filter(
        (c) => !(c.project_id === projectId && c.activity_id === activityId),
      );
      cells.push({ project_id: projectId, activity_id: activityId, status, note: null });
      return { ...prev, cells };
    });

    setPendingCells((prev) => new Set(prev).add(cellKey));
    startTransition(async () => {
      try {
        const result = await setCellStatus(projectId, activityId, status);
        if (result?.error) {
          // Rollback: refetch
          const fresh = await getMatrixData(visibleIds);
          setData(fresh);
        }
      } finally {
        setPendingCells((prev) => {
          const next = new Set(prev);
          next.delete(cellKey);
          return next;
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Project picker + legend */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0 flex-1">
            <MatriceProjectPicker
              pickableProjects={pickableProjects}
              onAdd={handleAddProject}
              disabled={shownIds.length >= MAX_VISIBLE_PROJECTS}
              maxProjects={MAX_VISIBLE_PROJECTS}
              shownCount={shownIds.length}
            />
          </div>
          <span className="shrink-0 text-[13px] font-medium text-veltol-fgDim">
            {t("picker.shownCount", { count: shownIds.length })}
          </span>
        </div>

        <div className="h-px bg-border" />

        <div className="flex items-center justify-between gap-4 p-5">
          <MatriceLegend />
          {isPending && (
            <span className="text-[12px] font-medium text-veltol-fgMute">{t("grid.loading")}</span>
          )}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-hidden rounded-card border border-border bg-card shadow-card">
        <MatriceGrid
          activities={data.activities}
          cells={data.cells}
          projects={data.projects}
          onChangeStatus={handleChangeStatus}
          onOpenDocuments={handleOpenDocuments}
          onHideProject={handleRemoveProject}
          docCounts={docCounts}
          pendingCells={pendingCells}
        />
      </div>

      {docsPopover && (() => {
        const project = data.projects.find((p) => p.id === docsPopover.projectId);
        const activity = data.activities.find((a) => a.id === docsPopover.activityId);
        const linkedId = `${docsPopover.projectId}:${docsPopover.activityId}`;
        const label = [project?.name, activity?.name].filter(Boolean).join(" · ");
        return (
          <DocumentsPopover
            open
            onClose={() => setDocsPopover(null)}
            linkedType="matrice_cell"
            linkedId={linkedId}
            projectId={docsPopover.projectId}
            contextLabel={label}
            canMutate
          />
        );
      })()}
    </div>
  );
}
