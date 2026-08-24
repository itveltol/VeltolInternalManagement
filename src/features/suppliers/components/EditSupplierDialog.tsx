"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { updateSupplierAction } from "@/app/[locale]/(app)/suppliers/actions";
import type { Supplier } from "../types";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

interface SupplierFields {
  name: string;
  cui: string;
  reg_com: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  iban: string;
  notes: string;
}

function seedFields(s: Supplier): SupplierFields {
  return {
    name: s.name,
    cui: s.cui ?? "",
    reg_com: s.reg_com ?? "",
    contact_person: s.contact_person ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    address: s.address ?? "",
    iban: s.iban ?? "",
    notes: s.notes ?? "",
  };
}

interface Props {
  supplier: Supplier;
  open: boolean;
  onClose: () => void;
}

export function EditSupplierDialog({ supplier, open, onClose }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        {/* Keyed on supplier.id so switching which supplier is being edited
            remounts the form with fresh state, instead of resyncing state
            from a new prop value inside an effect. */}
        <EditSupplierForm key={supplier.id} supplier={supplier} onClose={onClose} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EditSupplierForm({ supplier, onClose }: Omit<Props, "open">) {
  const t = useTranslations("suppliers");
  const [fields, setFields] = useState<SupplierFields>(() => seedFields(supplier));
  const [state, action, pending] = useActionState(updateSupplierAction, null);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  const setField = useCallback(
    (key: keyof SupplierFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  return (
    <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
      <Dialog.Title className="text-xl font-semibold text-veltol-fg">
        {t("editSupplier")}
      </Dialog.Title>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="supplierId" value={supplier.id} />

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
          <Input name="name" required value={fields.name} onChange={setField("name")} aria-invalid={Boolean(state?.fieldErrors?.name)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.cui")}</Label>
            <Input name="cui" value={fields.cui} onChange={setField("cui")} aria-invalid={Boolean(state?.fieldErrors?.cui)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.regCom")}</Label>
            <Input name="reg_com" value={fields.reg_com} onChange={setField("reg_com")} aria-invalid={Boolean(state?.fieldErrors?.reg_com)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contactPerson")}</Label>
            <Input name="contact_person" value={fields.contact_person} onChange={setField("contact_person")} aria-invalid={Boolean(state?.fieldErrors?.contact_person)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phone")}</Label>
            <Input name="phone" value={fields.phone} onChange={setField("phone")} aria-invalid={Boolean(state?.fieldErrors?.phone)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.email")}</Label>
            <Input name="email" type="email" value={fields.email} onChange={setField("email")} aria-invalid={Boolean(state?.fieldErrors?.email)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.iban")}</Label>
            <Input name="iban" value={fields.iban} onChange={setField("iban")} aria-invalid={Boolean(state?.fieldErrors?.iban)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.address")}</Label>
          <Input name="address" value={fields.address} onChange={setField("address")} aria-invalid={Boolean(state?.fieldErrors?.address)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.notes")}</Label>
          <textarea name="notes" rows={3} value={fields.notes} onChange={setField("notes")} className={TEXTAREA_CLASS} aria-invalid={Boolean(state?.fieldErrors?.notes)} />
        </div>

        {state?.error && (
          <p className="text-sm text-veltol-red">{t(state.error as Parameters<typeof t>[0])}</p>
        )}
        {state?.success && (
          <p className="text-sm text-veltol-green">{t(state.success as Parameters<typeof t>[0])}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
          <Button type="submit" disabled={pending}>{pending ? t("saving") : t("save")}</Button>
        </div>
      </form>
    </Dialog.Popup>
  );
}
