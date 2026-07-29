"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createSubcontractorAction } from "@/app/[locale]/(app)/subcontractors/actions";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface SubcontractorFields {
  name: string;
  contact_person: string;
  phone: string;
  price_eur: string;
  price_lei: string;
  deadline: string;
  notes: string;
}

const EMPTY: SubcontractorFields = { name: "", contact_person: "", phone: "", price_eur: "", price_lei: "", deadline: "", notes: "" };

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (subcontractor: { id: number; name: string }) => void;
}

export function AddSubcontractorDialog({ open, onClose, onCreated }: Props) {
  const t = useTranslations("subcontractors");
  const [fields, setFields] = useState<SubcontractorFields>(EMPTY);
  const [state, action, pending] = useActionState(createSubcontractorAction, null);

  useEffect(() => {
    if (!open) setFields(EMPTY);
  }, [open]);

  useEffect(() => {
    if (state?.success) {
      if (state.subcontractor) onCreated?.(state.subcontractor);
      onClose();
    }
  }, [state?.success]);

  const setField = useCallback(
    (key: keyof SubcontractorFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <Dialog.Title className="text-xl font-semibold text-veltol-fg">
            {t("addSubcontractor")}
          </Dialog.Title>

          <form action={action} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
              <Input name="name" required value={fields.name} onChange={setField("name")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contactPerson")}</Label>
                <Input name="contact_person" value={fields.contact_person} onChange={setField("contact_person")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phone")}</Label>
                <Input name="phone" value={fields.phone} onChange={setField("phone")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.priceEur")}</Label>
                <Input name="price_eur" type="number" min="0" value={fields.price_eur} onChange={setField("price_eur")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.priceLei")}</Label>
                <Input name="price_lei" type="number" min="0" value={fields.price_lei} onChange={setField("price_lei")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.deadline")}</Label>
                <Input name="deadline" type="date" value={fields.deadline} onChange={setField("deadline")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
              <textarea name="notes" rows={3} value={fields.notes} onChange={setField("notes")} className={TEXTAREA_CLASS} />
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
