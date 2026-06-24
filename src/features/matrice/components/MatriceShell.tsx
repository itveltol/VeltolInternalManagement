"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { MatrixData, MatrixProject, MatrixCell, ActivityStatus } from "../types";
import { MatriceProjectPicker } from "./MatriceProjectPicker";
import { MatriceGrid } from "./MatriceGrid";
import { MatriceLegend } from "./MatriceLegend";
import { setCellStatus, getMatrixData } from "@/app/[locale]/(app)/matrice-status/actions";

const LS_KEY = "veltol_matrice_selected_projects";

interface Props {
  initialData: MatrixData;
  allProjects: MatrixProject[];
}

export function MatriceShell({ initialData, allProjects }: Props) {
  const t = useTranslations("matrice");
  const [isPending, startTransition] = useTransition();

  // Restore selection from localStorage
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (typeof window === "undefined") return initialData.projects.map((p) => p.id);
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as number[];
        // Only keep ids that actually exist in allProjects
        const validIds = allProjects.map((p) => p.id);
        return parsed.filter((id) => validIds.includes(id));
      }
    } catch { /* ignore */ }
    return initialData.projects.map((p) => p.id);
  });

  const [data, setData] = useState<MatrixData>(initialData);

  // Persist selection
  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(selectedIds)); } catch { /* ignore */ }
  }, [selectedIds]);

  // Reload matrix when selection changes
  useEffect(() => {
    startTransition(async () => {
      const fresh = await getMatrixData(selectedIds);
      setData(fresh);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  function handleChangeStatus(projectId: number, activityId: number, status: ActivityStatus) {
    // Optimistic update
    setData((prev) => {
      const cells: MatrixCell[] = prev.cells.filter(
        (c) => !(c.project_id === projectId && c.activity_id === activityId),
      );
      cells.push({ project_id: projectId, activity_id: activityId, status, note: null });
      return { ...prev, cells };
    });

    startTransition(async () => {
      const result = await setCellStatus(projectId, activityId, status);
      if (result?.error) {
        // Rollback: refetch
        const fresh = await getMatrixData(selectedIds);
        setData(fresh);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Project picker */}
      <div className="rounded-xl border border-white/[0.07] bg-veltol-surface/30 p-4">
        <MatriceProjectPicker
          allProjects={allProjects}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between gap-4">
        <MatriceLegend />
        {isPending && (
          <span className="font-mono text-[10px] text-veltol-fgMute">{t("grid.loading")}</span>
        )}
      </div>

      {/* Matrix */}
      <div className="rounded-xl border border-t-2 border-t-veltol-aqua/60 border-white/[0.07] bg-veltol-surface/20 p-0 overflow-hidden">
        <MatriceGrid
          activities={data.activities}
          cells={data.cells}
          projects={data.projects}
          onChangeStatus={handleChangeStatus}
        />
      </div>
    </div>
  );
}
