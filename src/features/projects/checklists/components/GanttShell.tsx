"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { GanttChart } from "./GanttChart";
import { AddCustomTaskDialog } from "./AddCustomTaskDialog";
import { ScheduleTaskDialog } from "./ScheduleTaskDialog";
import { deleteCustomTaskAction, unscheduleChecklistItemAction } from "@/app/[locale]/(app)/projects/[id]/actions";
import { useGanttStore } from "../hooks/useGanttStore";
import type { ChecklistRow } from "@/features/projects/checklists/types";
import type { Team } from "@/features/teams/types";

interface Props {
  rows: ChecklistRow[];
  projectId: number;
  teams: Team[];
  canMutate: boolean;
}

export function GanttShell({ rows, projectId, teams, canMutate }: Props) {
  const t = useTranslations("checklist");
  const router = useRouter();
  const [, startTransition] = useTransition();

  const {
    isAddTaskDialogOpen, editingRow,
    openAddTaskDialog, closeAddTaskDialog,
    openScheduleDialog, closeScheduleDialog,
  } = useGanttStore();

  function handleDelete(row: ChecklistRow) {
    if (!confirm(t("gantt.confirmDeleteTask"))) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", String(projectId));
      fd.set("item_number", String(row.number));
      await deleteCustomTaskAction(null, fd);
      router.refresh();
    });
  }

  function handleUnschedule(row: ChecklistRow) {
    if (!confirm(t("gantt.confirmUnscheduleTask"))) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("project_id", String(projectId));
      fd.set("item_number", String(row.number));
      await unscheduleChecklistItemAction(null, fd);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canMutate && (
        <div className="flex justify-end">
          <Button onClick={openAddTaskDialog} variant="outline">
            {t("gantt.addCustomTask")}
          </Button>
        </div>
      )}

      <GanttChart
        rows={rows}
        onSchedule={openScheduleDialog}
        onDelete={handleDelete}
        onUnschedule={handleUnschedule}
        canMutate={canMutate}
      />

      <AddCustomTaskDialog
        projectId={projectId}
        teams={teams}
        open={isAddTaskDialogOpen}
        onClose={() => {
          closeAddTaskDialog();
          router.refresh();
        }}
      />

      {editingRow && (
        <ScheduleTaskDialog
          row={editingRow}
          projectId={projectId}
          teams={teams}
          open={!!editingRow}
          onClose={() => {
            closeScheduleDialog();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
