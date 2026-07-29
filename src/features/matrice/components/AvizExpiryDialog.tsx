"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";

const INPUT_CLASS =
  "h-8 w-full rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20";

interface Props {
  open: boolean;
  activityName: string;
  onConfirm: (expiresAt: string) => void;
  onCancel: () => void;
}

export function AvizExpiryDialog({ open, activityName, onConfirm, onCancel }: Props) {
  const t = useTranslations("matrice");
  const [expiresAt, setExpiresAt] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next) onCancel();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expiresAt) return;
    onConfirm(expiresAt);
    setExpiresAt("");
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-2xl sm:p-6">
          <Dialog.Title className="text-lg font-semibold text-veltol-fg">
            {t("avizExpiryDialog.title")}
          </Dialog.Title>
          <p className="mt-1 text-[13px] text-veltol-fgMute">
            {t("avizExpiryDialog.description", { activity: activityName })}
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-veltol-fgMute">
                {t("avizExpiryDialog.dateLabel")}
              </Label>
              <input
                type="date"
                required
                autoFocus
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={onCancel}>
                {t("avizExpiryDialog.cancel")}
              </Button>
              <Button type="submit" disabled={!expiresAt}>
                {t("avizExpiryDialog.confirm")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
