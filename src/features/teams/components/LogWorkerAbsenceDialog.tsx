"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { toast } from "sonner";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { logWorkerAbsenceAction } from "@/app/[locale]/(app)/vacation/actions";
import type { TeamWorker } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  worker: TeamWorker;
}

export function LogWorkerAbsenceDialog({ open, onClose, worker }: Props) {
  const t = useTranslations("teams");
  const tv = useTranslations("vacation");
  const [state, formAction, pending] = useActionState(logWorkerAbsenceAction, null);

  useEffect(() => {
    if (state?.success) {
      toast.success(tv(state.success as "requestCreated"));
      onClose();
    } else if (state?.error) {
      toast.error(tv(state.error as "errorGeneric" | "errorNoWorkingDays" | "errorNotAllowed"));
    }
  }, [state]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("logAbsence", { name: `${worker.first_name} ${worker.last_name ?? ""}`.trim() })}
          </Dialog.Title>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="team_worker_id" value={worker.id} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("absenceStart")}</Label>
                <Input name="start_date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("absenceEnd")}</Label>
                <Input name="end_date" type="date" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("absenceReason")}</Label>
              <Input name="reason" />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
              <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
