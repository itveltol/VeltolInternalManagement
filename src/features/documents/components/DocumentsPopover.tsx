"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/shared/components/ui/button";
import { DocumentList } from "./DocumentList";
import { AddDocumentDialog } from "./AddDocumentDialog";
import { getLinkedDocuments } from "@/app/[locale]/(app)/projects/[id]/actions";
import type { Document, DocumentLinkedType } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  linkedType: DocumentLinkedType;
  linkedId: string;
  projectId: number | null;
  contextLabel: string;
  canMutate: boolean;
}

export function DocumentsPopover({
  open,
  onClose,
  linkedType,
  linkedId,
  projectId,
  contextLabel,
  canMutate,
}: Props) {
  const t = useTranslations("documents");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !linkedId) return;
    startTransition(async () => {
      const docs = await getLinkedDocuments(linkedType, linkedId);
      setDocuments(docs);
    });
  }, [open, linkedType, linkedId]);

  return (
    <Dialog.Root open={open} onOpenChange={(o: boolean) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="text-base font-semibold text-veltol-fg">
                {t("attachDocuments")}
              </Dialog.Title>
              <p className="mt-0.5 font-mono text-[11px] text-veltol-fgMute">{contextLabel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>✕</Button>
          </div>

          {isPending ? (
            <p className="font-mono text-[11px] text-veltol-fgMute">{t("loadingDocuments")}</p>
          ) : (
            <DocumentList
              documents={documents}
              linkedType={linkedType}
              linkedId={linkedId}
              projectId={projectId}
              contextLabel={contextLabel}
              canMutate={canMutate}
              compact
            />
          )}

          <AddDocumentDialog />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
