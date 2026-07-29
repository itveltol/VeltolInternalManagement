"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AutoProgressWarningDialog({ open, onConfirm, onCancel }: Props) {
  const t = useTranslations("matrice");

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6">
          <Dialog.Title className="text-lg font-semibold text-veltol-fg">
            {t("autoProgressWarning.title")}
          </Dialog.Title>
          <p className="mt-1 text-[13px] text-veltol-fgMute">
            {t("autoProgressWarning.description")}
          </p>

          <div className="mt-4 flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("autoProgressWarning.cancel")}
            </Button>
            <Button type="button" onClick={onConfirm}>
              {t("autoProgressWarning.confirm")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
