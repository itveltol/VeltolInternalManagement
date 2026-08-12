"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { NoteThread } from "./NoteThread";
import type { NoteAnchor } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  anchor: NoteAnchor;
  anchorLabel: string;
}

export function NoteThreadPopover({ open, onClose, anchor, anchorLabel }: Props) {
  const t = useTranslations("comms");

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="text-base font-semibold text-veltol-fg">
                {t("discussion")}
              </Dialog.Title>
              <p className="mt-0.5 font-mono text-[11px] text-veltol-fgMute">{anchorLabel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>✕</Button>
          </div>

          <NoteThread anchor={anchor} anchorLabel={anchorLabel} />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
