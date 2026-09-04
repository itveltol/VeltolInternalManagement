"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import type { DoubleBookingConflictView, DoubleBookingResolution } from "@/app/[locale]/(app)/schedule/actions";

interface Props {
  open: boolean;
  conflicts: DoubleBookingConflictView[];
  onResolve: (resolutions: DoubleBookingResolution[]) => void;
  onCancel: () => void;
}

export function DoubleBookingDialog({ open, conflicts, onResolve, onCancel }: Props) {
  const t = useTranslations("schedule");
  const [choices, setChoices] = useState<Record<string, "keepHere" | "keepOther">>({});

  useEffect(() => {
    if (!open) return;
    // Default every conflict to the common case: keep the worker on the new assignment.
    setChoices(Object.fromEntries(conflicts.map((c) => [`${c.subjectKey}:${c.assignmentId}`, "keepHere"])));
  }, [open, conflicts]);

  function keyOf(c: DoubleBookingConflictView) {
    return `${c.subjectKey}:${c.assignmentId}`;
  }

  function handleConfirm() {
    onResolve(
      conflicts.map((c) => ({
        subjectKey: c.subjectKey,
        assignmentId: c.assignmentId,
        choice: choices[keyOf(c)] ?? "keepHere",
      })),
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[51] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("doubleBooking.title")}
          </Dialog.Title>
          <p className="mt-2 text-sm text-veltol-fgMute">{t("doubleBooking.description")}</p>

          <div className="mt-4 space-y-4">
            {conflicts.map((c) => (
              <div key={keyOf(c)} className="rounded-lg border border-border p-3">
                <p className="text-sm text-veltol-fg">
                  {t("doubleBooking.conflictLine", {
                    name: c.assigneeName,
                    project: c.projectName,
                    start: c.start_date,
                    end: c.end_date,
                  })}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={choices[keyOf(c)] === "keepHere" ? "default" : "outline"}
                    onClick={() => setChoices((prev) => ({ ...prev, [keyOf(c)]: "keepHere" }))}
                  >
                    {t("doubleBooking.keepHere")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={choices[keyOf(c)] === "keepOther" ? "default" : "outline"}
                    onClick={() => setChoices((prev) => ({ ...prev, [keyOf(c)]: "keepOther" }))}
                  >
                    {t("doubleBooking.keepOther")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={handleConfirm}>
              {t("save")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
