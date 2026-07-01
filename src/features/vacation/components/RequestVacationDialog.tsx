"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createVacationRequest, updateVacationRequest } from "@/app/[locale]/(app)/vacation/actions";
import type { VacationRequest } from "../types";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20 resize-none";

interface Props {
  open: boolean;
  request?: VacationRequest;
  onClose: () => void;
}

export function RequestVacationDialog({ open, request, onClose }: Props) {
  const t = useTranslations("vacation");
  const isEdit = !!request;
  const action = isEdit ? updateVacationRequest : createVacationRequest;

  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {isEdit ? t("editRequest") : t("requestVacation")}
          </Dialog.Title>

          <form action={formAction} className="mt-6 space-y-4">
            {isEdit && <input type="hidden" name="id" value={request.id} />}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("startDate")} *</Label>
                <input
                  name="start_date"
                  type="date"
                  required
                  defaultValue={request?.start_date}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("endDate")} *</Label>
                <input
                  name="end_date"
                  type="date"
                  required
                  defaultValue={request?.end_date}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("reason")}</Label>
              <textarea
                name="reason"
                rows={3}
                defaultValue={request?.reason ?? ""}
                className={TEXTAREA_CLASS}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {t(state.error as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("dismiss")}</Button>} />
              <Button type="submit" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
