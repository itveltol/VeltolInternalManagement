"use client";

import { useState, type TransitionStartFunction } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, Trash2, Link2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import type { Activity, ActivityDependency, PhaseWithActivities } from "../types";
import {
  renameActivity,
  reorderActivity,
  moveActivityToPhase,
  setActivityExpiresRequired,
  deleteActivity,
  type ActionState,
} from "@/app/[locale]/(app)/settings/matrice-catalog/actions";
import { DependencyPickerDialog } from "./DependencyPickerDialog";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

interface Props {
  activity: Activity;
  allPhases: PhaseWithActivities[];
  allActivities: Activity[];
  dependencies: ActivityDependency[];
  dependencyCount: number;
  isFirst: boolean;
  isLast: boolean;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  onResult: (result: ActionState) => void;
}

export function ActivityRow({
  activity, allPhases, allActivities, dependencies, dependencyCount, isFirst, isLast, isPending, startTransition, onResult,
}: Props) {
  const t = useTranslations("matriceCatalog");
  const confirm = useConfirm();
  const [name, setName] = useState(activity.name);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);

  function commitRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === activity.name) { setName(activity.name); return; }
    startTransition(async () => onResult(await renameActivity(activity.id, trimmed)));
  }

  function handleReorder(direction: "up" | "down") {
    startTransition(async () => onResult(await reorderActivity(activity.id, direction)));
  }

  function handleMoveToPhase(phaseId: number) {
    startTransition(async () => onResult(await moveActivityToPhase(activity.id, phaseId)));
  }

  function handleToggleExpiresRequired(checked: boolean) {
    startTransition(async () => onResult(await setActivityExpiresRequired(activity.id, checked)));
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t("confirmDeleteActivity"),
      description: activity.is_aviz || dependencyCount > 0 ? t("confirmDeleteActivityWithLinks") : undefined,
      confirmLabel: t("delete"),
    });
    if (!ok) return;
    startTransition(async () => onResult(await deleteActivity(activity.id)));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 md:px-6">
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          disabled={isFirst || isPending}
          onClick={() => handleReorder("up")}
          className="text-veltol-fgMute hover:text-veltol-fg disabled:opacity-30"
          aria-label={t("moveUp")}
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={isLast || isPending}
          onClick={() => handleReorder("down")}
          className="text-veltol-fgMute hover:text-veltol-fg disabled:opacity-30"
          aria-label={t("moveDown")}
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitRename}
        className={`${INPUT_CLASS} min-w-[180px] flex-1`}
      />

      <Select
        value={activity.phase_id}
        onChange={(e) => handleMoveToPhase(Number(e.target.value))}
        className="max-w-[200px]"
      >
        {allPhases.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>

      <label className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-veltol-fgMute">
        <input
          type="checkbox"
          checked={activity.expires_required}
          disabled={activity.is_aviz}
          onChange={(e) => handleToggleExpiresRequired(e.target.checked)}
          title={activity.is_aviz ? t("expiresRequiredLockedByAviz") : undefined}
        />
        {t("expiresRequired")}
      </label>

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => setDependencyDialogOpen(true)}
      >
        <Link2 data-icon="inline-start" /> {t("dependencies")}{dependencyCount > 0 ? ` (${dependencyCount})` : ""}
      </Button>

      <Button
        size="icon-sm"
        variant="destructive"
        title={t("delete")}
        disabled={isPending}
        onClick={handleDelete}
      >
        <Trash2 />
      </Button>

      {dependencyDialogOpen && (
        <DependencyPickerDialog
          activity={activity}
          allActivities={allActivities}
          dependencies={dependencies}
          startTransition={startTransition}
          onResult={onResult}
          onClose={() => setDependencyDialogOpen(false)}
        />
      )}
    </div>
  );
}
