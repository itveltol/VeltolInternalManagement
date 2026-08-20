"use client";

import { type TransitionStartFunction } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { Activity, ActivityDependency } from "../types";
import { wouldCreateCycle } from "../services/matriceAdminService";
import {
  addActivityDependency,
  removeActivityDependency,
  type ActionState,
} from "@/app/[locale]/(app)/settings/matrice-catalog/actions";

interface Props {
  activity: Activity;
  allActivities: Activity[];
  dependencies: ActivityDependency[];
  startTransition: TransitionStartFunction;
  onResult: (result: ActionState) => void;
  onClose: () => void;
}

export function DependencyPickerDialog({ activity, allActivities, dependencies, startTransition, onResult, onClose }: Props) {
  const t = useTranslations("matriceCatalog");

  const currentDependsOn = new Set(
    dependencies.filter((d) => d.activity_id === activity.id).map((d) => d.depends_on_activity_id),
  );

  const candidates = allActivities.filter((a) => a.id !== activity.id && !a.is_section_header);

  function toggle(dependsOnId: number, checked: boolean) {
    if (checked && wouldCreateCycle(dependencies, activity.id, dependsOnId)) {
      toast.error(t("errorDependencyCycle"));
      return;
    }
    startTransition(async () => {
      const result = checked
        ? await addActivityDependency(activity.id, dependsOnId)
        : await removeActivityDependency(activity.id, dependsOnId);
      onResult(result);
    });
  }

  return (
    <Dialog.Root open onOpenChange={(next: boolean) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-veltol-fg">
              {t("dependencyDialog.title", { activity: activity.name })}
            </Dialog.Title>
            <button type="button" onClick={onClose} className="text-veltol-fgMute hover:text-veltol-fg">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-[13px] text-veltol-fgMute">{t("dependencyDialog.description")}</p>

          <div className="mt-4 flex-1 space-y-1 overflow-y-auto">
            {candidates.map((c) => (
              <label key={c.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] hover:bg-veltol-surface/50">
                <input
                  type="checkbox"
                  checked={currentDependsOn.has(c.id)}
                  onChange={(e) => toggle(c.id, e.target.checked)}
                />
                <span className="text-veltol-fg">{c.name}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 flex justify-end pt-1">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("dependencyDialog.close")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
