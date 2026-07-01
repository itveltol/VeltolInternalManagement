"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Label } from "@/shared/components/ui/label";
import { Button } from "@/shared/components/ui/button";
import { createDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { useDocumentsStore } from "../hooks/useDocumentsStore";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-white/10 bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-aqua/50 focus:ring-2 focus:ring-veltol-aqua/20";

export function AddDocumentDialog() {
  const t = useTranslations("documents");
  const { addContext, closeAddDialog } = useDocumentsStore();
  const [state, formAction, pending] = useActionState(createDocumentAction, null);
  const [isRenewable, setIsRenewable] = useState(false);

  useEffect(() => {
    if (state?.success) {
      closeAddDialog();
      setIsRenewable(false);
    }
  }, [state?.success]);

  useEffect(() => {
    if (!addContext) setIsRenewable(false);
  }, [addContext]);

  const open = !!addContext;

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && closeAddDialog()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/[0.08] bg-veltol-deep p-8 shadow-2xl">
          <Dialog.Title className="font-display text-xl font-semibold text-veltol-fg">
            {t("addDocument")}
          </Dialog.Title>
          {addContext && (
            <p className="mt-1 font-mono text-[11px] text-veltol-fgMute">{addContext.contextLabel}</p>
          )}

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="linked_type" value={addContext?.linkedType ?? ""} />
            <input type="hidden" name="linked_id"   value={addContext?.linkedId ?? ""} />
            <input type="hidden" name="project_id"  value={addContext?.projectId ?? ""} />

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.name")} *</Label>
              <input
                name="name"
                type="text"
                required
                placeholder={t("fields.namePlaceholder")}
                className={INPUT_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.url")} *</Label>
              <input
                name="url"
                type="url"
                required
                placeholder="https://veltolholding.sharepoint.com/..."
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex items-center gap-2.5">
              <input
                id="is_renewable"
                name="is_renewable"
                type="checkbox"
                checked={isRenewable}
                onChange={(e) => setIsRenewable(e.target.checked)}
                className="h-3.5 w-3.5 rounded border border-white/20 bg-veltol-surface/60 accent-veltol-aqua"
              />
              <Label htmlFor="is_renewable" className="mono-label cursor-pointer text-[9px] text-veltol-fgMute">
                {t("fields.isRenewable")}
              </Label>
            </div>

            {isRenewable && (
              <div className="space-y-1.5">
                <Label className="mono-label text-[9px] text-veltol-fgMute">{t("fields.expiresAt")}</Label>
                <input
                  name="expires_at"
                  type="date"
                  className={INPUT_CLASS}
                />
              </div>
            )}

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
