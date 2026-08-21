"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Select } from "@/shared/components/ui/select";
import { TableShell, TableToolbar } from "@/shared/components/ui/table-shell";
import type { ContractType } from "@/features/projects/types";
import type { GanttPhaseKey } from "@/features/gantt/types";
import type { MatriceCatalog } from "../types";
import { createPhase, type ActionState } from "@/app/[locale]/(app)/settings/matrice-catalog/actions";
import { PhaseEditor } from "./PhaseEditor";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const SERVICE_TYPES: ContractType[] = ["proiectare", "executie", "mentenanta"];
const GANTT_KEYS: GanttPhaseKey[] = ["planning", "execution", "autorizare"];

interface Props {
  initialCatalog: MatriceCatalog;
}

export function MatriceCatalogEditor({ initialCatalog }: Props) {
  const t = useTranslations("matriceCatalog");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseServiceType, setNewPhaseServiceType] = useState<ContractType>("proiectare");
  const [newPhaseGanttKey, setNewPhaseGanttKey] = useState<GanttPhaseKey | "">("");

  function handleResult(result: ActionState) {
    if (result?.error) toast.error(t(result.error as Parameters<typeof t>[0]));
    router.refresh();
  }

  function handleCreatePhase(e: React.FormEvent) {
    e.preventDefault();
    if (!newPhaseName.trim()) return;
    startTransition(async () => {
      const result = await createPhase(
        newPhaseName.trim(),
        newPhaseServiceType,
        newPhaseGanttKey === "" ? null : newPhaseGanttKey,
      );
      if (!result?.error) setNewPhaseName("");
      handleResult(result);
    });
  }

  const allActivities = useMemo(
    () => initialCatalog.phases.flatMap((p) => p.activities),
    [initialCatalog.phases],
  );
  const dependencyCountByActivityId = useMemo(() => {
    const map = new Map<number, number>();
    for (const dep of initialCatalog.dependencies) {
      map.set(dep.activity_id, (map.get(dep.activity_id) ?? 0) + 1);
    }
    return map;
  }, [initialCatalog.dependencies]);
  const checklistLinkedActivityIds = useMemo(
    () => new Set(initialCatalog.checklistLinkedActivityIds),
    [initialCatalog.checklistLinkedActivityIds],
  );

  return (
    <div className="space-y-6">
      {initialCatalog.phases.map((phase, index) => (
        <PhaseEditor
          key={phase.id}
          phase={phase}
          allPhases={initialCatalog.phases}
          allActivities={allActivities}
          dependencies={initialCatalog.dependencies}
          dependencyCountByActivityId={dependencyCountByActivityId}
          checklistLinkedActivityIds={checklistLinkedActivityIds}
          isFirst={index === 0}
          isLast={index === initialCatalog.phases.length - 1}
          isPending={isPending}
          startTransition={startTransition}
          onResult={handleResult}
        />
      ))}

      <TableShell>
        <TableToolbar>
          <span className="text-xs font-medium text-veltol-fgMute">{t("addPhase")}</span>
        </TableToolbar>
        <form onSubmit={handleCreatePhase} className="flex flex-wrap items-end gap-3 p-4 md:p-6">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("phaseName")}</Label>
            <input
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("serviceType")}</Label>
            <Select
              value={newPhaseServiceType}
              onChange={(e) => setNewPhaseServiceType(e.target.value as ContractType)}
            >
              {SERVICE_TYPES.map((s) => (
                <option key={s} value={s}>{t(`serviceTypes.${s}`)}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("ganttPhaseKey")}</Label>
            <Select
              value={newPhaseGanttKey}
              onChange={(e) => setNewPhaseGanttKey(e.target.value as GanttPhaseKey | "")}
            >
              <option value="">{t("ganttPhaseKeyNone")}</option>
              {GANTT_KEYS.map((k) => (
                <option key={k} value={k}>{t(`ganttPhaseKeys.${k}`)}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={isPending} variant="outline">
            <Plus data-icon="inline-start" /> {t("addPhase")}
          </Button>
        </form>
      </TableShell>
    </div>
  );
}
