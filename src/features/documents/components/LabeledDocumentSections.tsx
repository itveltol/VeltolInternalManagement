"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { deleteDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { getActivitiesCatalog } from "@/app/[locale]/(app)/projects/[id]/actions";
import { DocumentDropzone } from "./DocumentDropzone";
import { DOCUMENT_LABELS } from "../types";
import { resolveLabelForActivityId, parseMatriceCellActivityId } from "../labelActivityMapping";
import type { Document } from "../types";
import type { Activity } from "@/features/matrice/types";

interface Props {
  documents: Document[];
  projectId: number;
  canMutate: boolean;
  activities: Activity[];
  onChanged: () => void;
}

function DocumentRow({
  doc,
  canMutate,
  isPending,
  onDelete,
}: {
  doc: Document;
  canMutate: boolean;
  isPending: boolean;
  onDelete: (id: number) => void;
}) {
  const t = useTranslations("documents");
  return (
    <div className="flex items-center justify-between gap-2">
      {doc.onedrive_item_id ? (
        <span className="truncate font-mono text-[12px] text-veltol-fg">{doc.name}</span>
      ) : (
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate font-mono text-[12px] text-veltol-accent underline-offset-2 hover:underline"
        >
          {doc.name}
        </a>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {doc.onedrive_item_id && (
          <Button size="sm" variant="outline" render={<a href={`/api/onedrive/${doc.onedrive_item_id}/content`} download />}>
            {t("files.download")}
          </Button>
        )}
        {canMutate && (
          <Button
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => onDelete(doc.id)}
          >
            {t("delete")}
          </Button>
        )}
      </div>
    </div>
  );
}

function LabelSection({
  label,
  documents,
  projectId,
  canMutate,
  isPending,
  onDelete,
  onChanged,
}: {
  label: string;
  documents: Document[];
  projectId: number;
  canMutate: boolean;
  isPending: boolean;
  onDelete: (id: number) => void;
  onChanged: () => void;
}) {
  return (
    <div className="space-y-2.5 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-medium text-veltol-fg">{label}</span>
        <span className="font-mono text-[10px] text-veltol-fgMute">{documents.length}</span>
      </div>

      {documents.length > 0 && (
        <div className="space-y-1.5">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} canMutate={canMutate} isPending={isPending} onDelete={onDelete} />
          ))}
        </div>
      )}

      <DocumentDropzone projectId={projectId} label={label} canMutate={canMutate} onChanged={onChanged} />
    </div>
  );
}

export function LabeledDocumentSections({ documents, projectId, canMutate, activities, onChanged }: Props) {
  const t = useTranslations("documents");
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [fetchedActivities, setFetchedActivities] = useState<Activity[]>([]);
  const loadedActivities = activities.length > 0 ? activities : fetchedActivities;

  useEffect(() => {
    if (activities.length > 0) return;
    getActivitiesCatalog().then(setFetchedActivities);
  }, [activities]);

  async function handleDelete(id: number) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("delete") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDocumentAction(id, projectId);
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else if (result?.success) {
        toast.success(t(result.success as "documentDeleted"));
        onChanged();
      }
    });
  }

  const byLabel = new Map<string, Document[]>();
  for (const doc of documents) {
    let label = doc.label;
    if (!label && doc.linked_type === "matrice_cell") {
      const activityId = parseMatriceCellActivityId(doc.linked_id);
      label = activityId !== null ? resolveLabelForActivityId(activityId, loadedActivities) : null;
    }
    if (!label) continue;
    const list = byLabel.get(label) ?? [];
    list.push(doc);
    byLabel.set(label, list);
  }

  const customLabels = [...byLabel.keys()].filter(
    (label) => !DOCUMENT_LABELS.includes(label as (typeof DOCUMENT_LABELS)[number]),
  );

  const pendingCustomFolders = customFolders.filter((name) => !customLabels.includes(name));

  return (
    <div className="space-y-4">
      {DOCUMENT_LABELS.map((label) => (
        <LabelSection
          key={label}
          label={label}
          documents={byLabel.get(label) ?? []}
          projectId={projectId}
          canMutate={canMutate}
          isPending={isPending}
          onDelete={handleDelete}
          onChanged={onChanged}
        />
      ))}

      {[...customLabels, ...pendingCustomFolders].map((label) => (
        <LabelSection
          key={label}
          label={label}
          documents={byLabel.get(label) ?? []}
          projectId={projectId}
          canMutate={canMutate}
          isPending={isPending}
          onDelete={handleDelete}
          onChanged={onChanged}
        />
      ))}

      {canMutate && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t("customFolderPlaceholder")}
            className="h-8 w-full max-w-xs rounded-lg border border-border bg-veltol-surface/60 px-2.5 py-1 font-mono text-sm text-veltol-fg outline-none focus:border-veltol-accent/50 focus:ring-2 focus:ring-veltol-accent/20"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!newFolderName.trim()}
            onClick={() => {
              const name = newFolderName.trim();
              if (!name) return;
              setCustomFolders((prev) => (prev.includes(name) ? prev : [...prev, name]));
              setNewFolderName("");
            }}
          >
            {t("addCustomFolder")}
          </Button>
        </div>
      )}
    </div>
  );
}
