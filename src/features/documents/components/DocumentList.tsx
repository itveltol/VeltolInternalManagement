"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { useDocumentsStore } from "../hooks/useDocumentsStore";
import { deleteDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import type { Document, DocumentLinkedType } from "../types";

interface Props {
  documents: Document[];
  linkedType: DocumentLinkedType;
  linkedId: string;
  projectId: number | null;
  contextLabel: string;
  canMutate: boolean;
  compact?: boolean;
}

export function DocumentList({
  documents,
  linkedType,
  linkedId,
  projectId,
  contextLabel,
  canMutate,
  compact = false,
}: Props) {
  const t = useTranslations("documents");
  const { openAddDialog } = useDocumentsStore();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const confirm = useConfirm();

  async function handleDelete(id: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("delete") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDocumentAction(id, projectId ?? undefined);
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else if (result?.success) toast.success(t(result.success as "documentDeleted"));
      router.refresh();
    });
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {documents.length === 0 ? (
        <p className="font-mono text-[11px] text-veltol-fgMute">{t("emptyState")}</p>
      ) : (
        documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between gap-2">
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-[12px] text-veltol-accent underline-offset-2 hover:underline"
            >
              {doc.name}
            </a>
            {canMutate && (
              <Button
                size="sm"
                variant="destructive"
                disabled={isPending}
                onClick={() => handleDelete(doc.id)}
                className="shrink-0"
              >
                {t("delete")}
              </Button>
            )}
          </div>
        ))
      )}
      {canMutate && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openAddDialog({ linkedType, linkedId, projectId, contextLabel })}
          className="mt-1"
        >
          {t("addDocument")}
        </Button>
      )}
    </div>
  );
}
