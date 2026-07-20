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
  hideMatriceProject,
  unhideMatriceProject,
} from "@/app/[locale]/(app)/matrice-status/actions";
import { getDocuments } from "@/app/[locale]/(app)/documents/actions";

interface Props {
  initialData: MatrixData;
  allProjects: MatrixProject[];
  initialHiddenIds: number[];
}

export function MatriceShell({ initialData, allProjects, initialHiddenIds }: Props) {
  const t = useTranslations("matrice");
  const [isPending, startTransition] = useTransition();

  const [hiddenIds, setHiddenIds] = useState<number[]>(initialHiddenIds);
  const [data, setData] = useState<MatrixData>(initialData);
  const [docCounts, setDocCounts] = useState<Map<string, number>>(new Map());
  const [docsPopover, setDocsPopover] = useState<{ projectId: number; activityId: number } | null>(null);
  const [pendingCells, setPendingCells] = useState<Set<string>>(new Set());

  const visibleIds = useMemo(
    () => allProjects.map((p) => p.id).filter((id) => !hiddenIds.includes(id)),
    [allProjects, hiddenIds],
  );

  const hiddenProjects = useMemo(
    () => allProjects.filter((p) => hiddenIds.includes(p.id)),
    [allProjects, hiddenIds],
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

  function handleHideProject(projectId: number) {
    setHiddenIds((prev) => (prev.includes(projectId) ? prev : [...prev, projectId]));
    startTransition(async () => {
      await hideMatriceProject(projectId);
    });
  }

  function handleUnhideProject(projectId: number) {
    setHiddenIds((prev) => prev.filter((id) => id !== projectId));
    startTransition(async () => {
      await unhideMatriceProject(projectId);
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
      {/* Project picker: only lists hidden projects, re-adds them on pick */}
      {hiddenProjects.length > 0 && (
        <div className="rounded-xl border border-border bg-veltol-surface/30 p-4">
          <MatriceProjectPicker hiddenProjects={hiddenProjects} onUnhide={handleUnhideProject} />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between gap-4">
        <MatriceLegend />
        {isPending && (
          <span className="font-mono text-[10px] text-veltol-fgMute">{t("grid.loading")}</span>
        )}
      </div>

      {/* Matrix */}
      <div className="rounded-xl border border-t-2 border-t-veltol-accent/60 border-border bg-veltol-surface/20 p-0 overflow-hidden">
        <MatriceGrid
          activities={data.activities}
          cells={data.cells}
          projects={data.projects}
          onChangeStatus={handleChangeStatus}
          onOpenDocuments={handleOpenDocuments}
          onHideProject={handleHideProject}
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
