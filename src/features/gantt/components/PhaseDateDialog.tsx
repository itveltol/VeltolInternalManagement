"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { savePhaseDates } from "@/app/[locale]/(app)/gantt/actions";
import { validatePhaseDates } from "../services/ganttPhaseService";
import { GANTT_PHASE_DATE_FIELDS, type GanttPhaseKey } from "../types";
import type { Project } from "@/features/projects/types";

const INPUT_CLASS =
  "h-9 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 disabled:cursor-not-allowed disabled:opacity-50";

interface Props {
  project: Project;
  phaseKey: GanttPhaseKey;
  open: boolean;
  onClose: () => void;
}

export function PhaseDateDialog({ project, phaseKey, open, onClose }: Props) {
  const t = useTranslations("gantt");
  const fields = GANTT_PHASE_DATE_FIELDS[phaseKey];
  const initialStartDate = (project[fields.start] as string | null) ?? "";
  const initialEndDate = (project[fields.end] as string | null) ?? "";

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setStartDate(initialStartDate);
    setEndDate(initialEndDate);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStartDate, initialEndDate, phaseKey, project.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validatePhaseDates(startDate || null, endDate || null);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await savePhaseDates(
        project.id,
        phaseKey,
        startDate || null,
        endDate || null,
      );
      if (result?.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t(`phase.${phaseKey}`)}
          </Dialog.Title>
          <p className="mt-1 text-sm text-veltol-fgDim">{project.name}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("startDate")}</Label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("endDate")}</Label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-veltol-red">{t(error as Parameters<typeof t>[0])}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
