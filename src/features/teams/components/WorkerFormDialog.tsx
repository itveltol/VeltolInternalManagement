"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { addWorkerAction, updateWorkerAction } from "@/app/[locale]/(app)/teams/[id]/actions";
import type { TeamWorker } from "../types";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface Props {
  open: boolean;
  onClose: () => void;
  teamId: number;
  worker?: TeamWorker | null;
}

export function WorkerFormDialog({ open, onClose, teamId, worker }: Props) {
  const t = useTranslations("teams");
  const mode = worker ? "edit" : "add";
  const [firstName, setFirstName] = useState(worker?.first_name ?? "");
  const [lastName, setLastName] = useState(worker?.last_name ?? "");
  const [phone, setPhone] = useState(worker?.phone ?? "");
  const [notes, setNotes] = useState(worker?.notes ?? "");
  const action = mode === "edit" ? updateWorkerAction : addWorkerAction;
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (!open) return;
    setFirstName(worker?.first_name ?? "");
    setLastName(worker?.last_name ?? "");
    setPhone(worker?.phone ?? "");
    setNotes(worker?.notes ?? "");
  }, [open, worker]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {mode === "edit" ? t("editWorker") : t("addWorker")}
          </Dialog.Title>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="teamId" value={teamId} />
            {mode === "edit" && worker && <input type="hidden" name="workerId" value={worker.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.firstName")} *</Label>
                <Input
                  name="first_name"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.lastName")}</Label>
                <Input
                  name="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phone")}</Label>
              <Input
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
              <textarea
                name="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={TEXTAREA_CLASS}
              />
            </div>

            {state?.error && (
              <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
            )}

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
