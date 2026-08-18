"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { setMaintenanceCheckAction } from "@/app/[locale]/(app)/projects/[id]/actions";
import { buildMaintenanceCycles } from "../services/maintenanceService";
import type { MaintenanceCheck, MaintenanceState } from "../types";

interface Props {
  projectId: number;
  checks: MaintenanceCheck[];
  canMutate: boolean;
  todayMs: number;
  onChanged?: () => void;
}

function stateVariant(state: MaintenanceState) {
  switch (state) {
    case "needsAttention": return "warning" as const;
    case "done": return "success" as const;
    default: return "outline" as const;
  }
}

export function MaintenanceShell({ projectId, checks, canMutate, todayMs, onChanged }: Props) {
  const t = useTranslations("maintenance");
  const [isPending, startTransition] = useTransition();

  const cycles = buildMaintenanceCycles(checks, new Date(todayMs));

  function handleToggle(year: number, period: "march" | "october", checked: boolean) {
    startTransition(async () => {
      const result = await setMaintenanceCheckAction(projectId, year, period, checked);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      onChanged?.();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-sm font-semibold text-veltol-fg">{t("title")}</div>
      <p className="mt-1 text-xs text-veltol-fgMute">{t("description")}</p>

      <div className="mt-4 space-y-3">
        {cycles.map(({ year, period, check, state }) => (
          <label
            key={period}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={check?.checked ?? false}
                disabled={!canMutate || isPending}
                onChange={(e) => handleToggle(year, period, e.target.checked)}
                className="h-4 w-4 rounded border border-border bg-veltol-surface accent-veltol-accent"
              />
              <span className="text-sm text-veltol-fgDim">
                {t(`period.${period}`, { year })}
              </span>
            </div>
            <Badge variant={stateVariant(state)}>{t(`state.${state}`)}</Badge>
          </label>
        ))}
      </div>
    </div>
  );
}
