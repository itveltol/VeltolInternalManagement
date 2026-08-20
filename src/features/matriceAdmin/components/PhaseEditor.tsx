"use client";

import { useState, type TransitionStartFunction } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import { TableShell, TableToolbar } from "@/shared/components/ui/table-shell";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { ContractType } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";
import type { Activity, ActivityDependency, PhaseWithActivities } from "../types";
import {
  renamePhase,
  reorderPhase,
  deletePhase,
  updatePhaseGating,
  createActivity,
  type ActionState,
} from "@/app/[locale]/(app)/settings/matrice-catalog/actions";
import { ActivityRow } from "./ActivityRow";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const SERVICE_TYPES: ContractType[] = ["proiectare", "executie", "mentenanta"];
const GANTT_KEYS: GanttPhaseKey[] = ["planning", "execution", "autorizare"];

interface Props {
  phase: PhaseWithActivities;
  allPhases: PhaseWithActivities[];
  allActivities: Activity[];
  dependencies: ActivityDependency[];
  dependencyCountByActivityId: Map<number, number>;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  onResult: (result: ActionState) => void;
}

export function PhaseEditor({
  phase, allPhases, allActivities, dependencies, dependencyCountByActivityId, isFirst, isLast, isPending, startTransition, onResult,
}: Props) {
  const t = useTranslations("matriceCatalog");
  const confirm = useConfirm();
  const [name, setName] = useState(phase.name);
  const [newActivityName, setNewActivityName] = useState("");

  function commitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === phase.name) { setName(phase.name); return; }
    startTransition(async () => onResult(await renamePhase(phase.id, trimmed)));
  }

  function handleReorder(direction: "up" | "down") {
    startTransition(async () => onResult(await reorderPhase(phase.id, direction)));
  }

  function handleGatingChange(serviceType: ContractType, ganttPhaseKey: GanttPhaseKey | "") {
    startTransition(async () =>
      onResult(await updatePhaseGating(phase.id, serviceType, ganttPhaseKey === "" ? null : ganttPhaseKey)),
    );
  }

  async function handleDeletePhase() {
    const ok = await confirm({
      title: t("confirmDeletePhase"),
      description: phase.activities.length > 0 ? t("confirmDeletePhaseWithActivities", { count: phase.activities.length }) : undefined,
      confirmLabel: t("delete"),
    });
    if (!ok) return;
    startTransition(async () => onResult(await deletePhase(phase.id)));
  }

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!newActivityName.trim()) return;
    startTransition(async () => {
      const result = await createActivity(phase.id, newActivityName.trim(), false);
      if (!result?.error) setNewActivityName("");
      onResult(result);
    });
  }

  return (
    <TableShell>
      <TableToolbar>
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="flex shrink-0 flex-col">
            <button
              type="button"
              disabled={isFirst || isPending}
              onClick={() => handleReorder("up")}
              className="text-veltol-fgMute hover:text-veltol-fg disabled:opacity-30"
              aria-label={t("moveUp")}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={isLast || isPending}
              onClick={() => handleReorder("down")}
              className="text-veltol-fgMute hover:text-veltol-fg disabled:opacity-30"
              aria-label={t("moveDown")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            className={`${INPUT_CLASS} max-w-xs font-bold`}
          />
          <Select
            value={phase.service_type}
            onChange={(e) => handleGatingChange(e.target.value as ContractType, phase.gantt_phase_key ?? "")}
            className="max-w-[160px]"
          >
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>{t(`serviceTypes.${s}`)}</option>
            ))}
          </Select>
          <Select
            value={phase.gantt_phase_key ?? ""}
            onChange={(e) => handleGatingChange(phase.service_type, e.target.value as GanttPhaseKey | "")}
            className="max-w-[160px]"
          >
            <option value="">{t("ganttPhaseKeyNone")}</option>
            {GANTT_KEYS.map((k) => (
              <option key={k} value={k}>{t(`ganttPhaseKeys.${k}`)}</option>
            ))}
          </Select>
        </div>
        <Button
          size="icon-sm"
          variant="destructive"
          title={t("delete")}
          disabled={isPending}
          onClick={handleDeletePhase}
        >
          <Trash2 />
        </Button>
      </TableToolbar>

      <div className="divide-y divide-border">
        {phase.activities.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-veltol-fgMute md:px-6">{t("noActivities")}</p>
        ) : (
          phase.activities.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              allPhases={allPhases}
              allActivities={allActivities}
              dependencies={dependencies}
              dependencyCount={dependencyCountByActivityId.get(activity.id) ?? 0}
              isFirst={index === 0}
              isLast={index === phase.activities.length - 1}
              isPending={isPending}
              startTransition={startTransition}
              onResult={onResult}
            />
          ))
        )}
      </div>

      <form onSubmit={handleAddActivity} className="flex items-end gap-3 border-t border-border p-4 md:px-6">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <input
            value={newActivityName}
            onChange={(e) => setNewActivityName(e.target.value)}
            placeholder={t("newActivityPlaceholder")}
            className={INPUT_CLASS}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          <Plus data-icon="inline-start" /> {t("addActivity")}
        </Button>
      </form>
    </TableShell>
  );
}
