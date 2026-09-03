"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { TableShell, TableToolbar } from "@/shared/components/ui/table-shell";
import { setPmColorAction } from "@/app/[locale]/(app)/schedule/actions";
import { pmColor, PM_COLOR_PALETTE } from "../utils/pmColor";
import type { PmColorEntry } from "../types";

interface Props {
  pmColors: PmColorEntry[];
  canMutate: boolean;
}

export function PmColorManager({ pmColors, canMutate }: Props) {
  const t = useTranslations("schedule");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savingPmId, setSavingPmId] = useState<string | null>(null);

  function handlePick(pmId: string, color: string) {
    setSavingPmId(pmId);
    startTransition(async () => {
      const result = await setPmColorAction(pmId, color);
      if (result?.error) toast.error(t(result.error as "errorGeneric" | "errorNotAllowed"));
      else router.refresh();
      setSavingPmId(null);
    });
  }

  return (
    <TableShell>
      <TableToolbar>
        <div>
          <div className="text-[11px] font-medium text-veltol-fgMute">{t("pmColors.eyebrow")}</div>
          <h2 className="mt-0.5 text-lg font-semibold text-veltol-fg">{t("pmColors.title")}</h2>
        </div>
      </TableToolbar>

      <div className="divide-y divide-border">
        {pmColors.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-veltol-fgMute">{t("pmColors.empty")}</p>
        ) : (
          pmColors.map((pm) => {
            const activeColor = pmColor(pm.pm_id, new Map(pm.color ? [[pm.pm_id, pm.color]] : []));
            return (
              <div key={pm.pm_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <span className="font-medium text-veltol-fg">{pm.name}</span>
                {canMutate ? (
                  <div className="flex flex-wrap gap-2">
                    {PM_COLOR_PALETTE.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        aria-label={swatch}
                        disabled={isPending}
                        onClick={() => handlePick(pm.pm_id, swatch)}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-border transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
                        style={{ backgroundColor: swatch }}
                      >
                        {activeColor === swatch && (savingPmId !== pm.pm_id || !isPending) && (
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span
                    className="h-6 w-6 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: activeColor }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </TableShell>
  );
}
