"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Project } from "@/features/projects/types";
import type { Activity, MatrixCell } from "@/features/matrice/types";
import type { ChecklistItemRecord } from "@/features/projects/checklists/types";
import type { GanttPhaseSegment } from "../types";
import { GANTT_PHASE_KEYS, GANTT_PHASE_COLOR } from "../types";
import { buildProjectGanttRows } from "../services/ganttPhaseService";
import { PortfolioGanttChart } from "./PortfolioGanttChart";
import { PhaseDateDialog } from "./PhaseDateDialog";
import { pinMatriceProject } from "@/app/[locale]/(app)/matrice-status/actions";

interface Props {
  project: Project;
  initialActivities: Activity[];
  initialCells: MatrixCell[];
  checklistRecords: ChecklistItemRecord[];
  todayMs: number;
  canMutate: boolean;
}

export function ProjectPhaseGanttShell({ project, initialActivities, initialCells, checklistRecords, todayMs, canMutate }: Props) {
  const t = useTranslations("gantt");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<GanttPhaseSegment | null>(null);

  const rows = useMemo(
    () => buildProjectGanttRows([project], initialActivities, initialCells, todayMs, { [project.id]: checklistRecords }),
    [project, initialActivities, initialCells, todayMs, checklistRecords],
  );

  return (
    <div className="space-y-6">
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

      <PortfolioGanttChart
        rows={rows}
        todayMs={todayMs}
        onNavigateToPhase={(projectId) => {
          startTransition(async () => {
            await pinMatriceProject(projectId);
            router.push("/matrice-status");
          });
        }}
        onEditDates={canMutate ? (_projectId, segment) => setEditing(segment) : () => {}}
        onHideProject={() => {}}
      />

      {editing && (
        <PhaseDateDialog
          project={project}
          phaseKey={editing.key}
          segment={editing}
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
