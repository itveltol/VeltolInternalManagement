"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { AiFillButton } from "@/shared/components/ui/ai-fill-button";
import { useAiFormFill } from "@/shared/hooks/useAiFormFill";
import { createClientAction } from "@/app/[locale]/(app)/clients/actions";
import { CLIENT_TYPES } from "../types";
import type { ClientType } from "../types";
import { cn } from "@/shared/utils/cn";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

const TEXTAREA_CLASS =
  "w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-2 font-sans text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20 resize-none";

interface ClientFields {
  name: string;
  cui: string;
  j_number: string;
  legal_rep: string;
  cnp: string;
  id_series: string;
  id_number: string;
  reg_address: string;
  contact_person: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY: ClientFields = {
  name: "", cui: "", j_number: "", legal_rep: "",
  cnp: "", id_series: "", id_number: "",
  reg_address: "", contact_person: "", email: "", phone: "", notes: "",
};

const COMPANY_TARGET = ["cui", "j_number", "legal_rep", "reg_address", "contact_person", "email", "phone"];
const PERSON_TARGET = ["cnp", "id_series", "id_number", "reg_address", "contact_person", "email", "phone"];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddClientDialog({ open, onClose }: Props) {
  const t = useTranslations("clients");
  const [clientType, setClientType] = useState<ClientType>("company");
  const [fields, setFields] = useState<ClientFields>(EMPTY);
  const [snapshot, setSnapshot] = useState<ClientFields | null>(null);
  const [state, action, pending] = useActionState(createClientAction, null);

  const targetFields = clientType === "company" ? COMPANY_TARGET : PERSON_TARGET;

  const getContext = useCallback(
    () => ({ name: fields.name, type: clientType }),
    [fields.name, clientType],
  );

  const { fillWithAi, loading, hasSuggestions, reset } = useAiFormFill({
    formType: "client",
    getContext,
    targetFields,
  });

  useEffect(() => {
    if (!open) {
      setFields(EMPTY);
      setSnapshot(null);
      reset();
    }
  }, [open]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success]);

  const setField = useCallback(
    (key: keyof ClientFields) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFields((f) => ({ ...f, [key]: e.target.value })),
    [],
  );

  const handleFill = async () => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi();
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ClientFields>) }));
    }
  };

  const handleFileSelect = async (file: File) => {
    setSnapshot({ ...fields });
    const suggestions = await fillWithAi(file);
    if (Object.keys(suggestions).length > 0) {
      setFields((f) => ({ ...f, ...(suggestions as Partial<ClientFields>) }));
    }
  };

  const handleUndo = () => {
    if (snapshot) {
      setFields(snapshot);
      setSnapshot(null);
      reset();
    }
  };

  const nameHasContent = fields.name.trim().length >= 3;

  const aiClass = (fieldKey: keyof ClientFields) =>
    cn(hasSuggestions && fields[fieldKey] ? "ring-1 ring-veltol-accent/30" : "");

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[90dvh] rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-8">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xl font-semibold text-veltol-fg">
              {t("addClient")}
            </Dialog.Title>
            <AiFillButton
              onFill={handleFill}
              onFileSelect={handleFileSelect}
              onUndo={handleUndo}
              loading={loading}
              hasSuggestions={hasSuggestions}
              disabled={!nameHasContent}
            />
          </div>

          <form action={action} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.type")} *</Label>
                <select
                  name="type"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value as ClientType)}
                  className={SELECT_CLASS}
                >
                  {CLIENT_TYPES.map((ct) => (
                    <option key={ct} value={ct} className="bg-card">
                      {t(`fields.type_${ct}` as Parameters<typeof t>[0])}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.name")} *</Label>
                <Input
                  name="name"
                  required
                  value={fields.name}
                  onChange={setField("name")}
                  placeholder={clientType === "company" ? "Acme S.R.L." : "Ion Popescu"}
                />
              </div>
            </div>

            {clientType === "company" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.cui")}</Label>
                  <Input name="cui" value={fields.cui} onChange={setField("cui")} placeholder="RO12345678" className={aiClass("cui")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.jNumber")}</Label>
                  <Input name="j_number" value={fields.j_number} onChange={setField("j_number")} placeholder="J40/123/2020" className={aiClass("j_number")} />
                </div>
              </div>
            )}

            {clientType === "company" && (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.legalRep")}</Label>
                <Input name="legal_rep" value={fields.legal_rep} onChange={setField("legal_rep")} placeholder="Ion Popescu" className={aiClass("legal_rep")} />
              </div>
            )}

            {clientType === "person" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.cnp")}</Label>
                  <Input name="cnp" value={fields.cnp} onChange={setField("cnp")} placeholder="1234567890123" maxLength={13} className={aiClass("cnp")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.idSeries")}</Label>
                  <Input name="id_series" value={fields.id_series} onChange={setField("id_series")} placeholder="AB" maxLength={2} className={aiClass("id_series")} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.idNumber")}</Label>
                  <Input name="id_number" value={fields.id_number} onChange={setField("id_number")} placeholder="123456" maxLength={6} className={aiClass("id_number")} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.regAddress")}</Label>
              <Input
                name="reg_address"
                value={fields.reg_address}
                onChange={setField("reg_address")}
                placeholder={clientType === "company" ? "Str. Exemple nr. 1, București" : "Str. Exemple nr. 1, Cluj-Napoca"}
                className={aiClass("reg_address")}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.contactPerson")}</Label>
                <Input name="contact_person" value={fields.contact_person} onChange={setField("contact_person")} placeholder="Maria Ionescu" className={aiClass("contact_person")} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.phone")}</Label>
                <Input name="phone" value={fields.phone} onChange={setField("phone")} placeholder="+40 700 000 000" className={aiClass("phone")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">{t("fields.email")}</Label>
              <Input name="email" type="email" value={fields.email} onChange={setField("email")} placeholder="contact@example.ro" className={aiClass("email")} />
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
