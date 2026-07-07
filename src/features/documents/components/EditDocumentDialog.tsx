"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { updateDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { useDocumentsStore } from "../hooks/useDocumentsStore";
import { DocumentFormFields } from "./DocumentFormFields";
import type { DocumentStatus } from "../types";

export function EditDocumentDialog() {
  const t = useTranslations("documents");
  const { editingDocument, closeEditDialog, responsibleProfiles } = useDocumentsStore();
  const [state, formAction, pending] = useActionState(updateDocumentAction, null);

  const [isRenewable, setIsRenewable] = useState(false);
  const [status, setStatus] = useState<DocumentStatus | "">("");

  useEffect(() => {
    if (editingDocument) {
      setIsRenewable(editingDocument.is_renewable);
      setStatus(editingDocument.status ?? "");
    }
  }, [editingDocument]);

  useEffect(() => {
    if (state?.success) closeEditDialog();
  }, [state?.success]);

  const open = !!editingDocument;

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && closeEditDialog()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-5 shadow-2xl overflow-y-auto max-h-[90vh] sm:p-8">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("editDocument")}
          </Dialog.Title>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="id" value={editingDocument?.id ?? ""} />
            <input type="hidden" name="project_id" value={editingDocument?.project_id ?? ""} />

            <DocumentFormFields
              defaults={editingDocument ?? undefined}
              responsibleProfiles={responsibleProfiles}
              isRenewable={isRenewable}
              onIsRenewableChange={setIsRenewable}
              status={status}
              onStatusChange={setStatus}
            />

            {state?.error && (
              <p className="text-sm text-veltol-red">
                {t(state.error as Parameters<typeof t>[0])}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close render={<Button type="button" variant="outline">{t("cancel")}</Button>} />
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
