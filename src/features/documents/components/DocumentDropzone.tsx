"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/shared/components/ui/button";
import { uploadDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { ensureProjectFolder } from "@/app/[locale]/(app)/projects/actions";

interface Props {
  projectId: number;
  label: string;
  activityId?: number;
  canMutate: boolean;
  onChanged: () => void;
}

export function DocumentDropzone({ projectId, label, activityId, canMutate, onChanged }: Props) {
  const t = useTranslations("documents");
  const tProjects = useTranslations("projects");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [needsFolder, setNeedsFolder] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isCreatingFolder, startCreatingFolder] = useTransition();

  function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    startTransition(async () => {
      let failures = 0;
      let firstErrorKey: string | null = null;
      for (const file of list) {
        const formData = new FormData();
        formData.set("project_id", String(projectId));
        formData.set("label", label);
        if (activityId !== undefined) formData.set("activity_id", String(activityId));
        formData.set("file", file);
        const result = await uploadDocumentAction(null, formData);
        if (result?.error) {
          failures++;
          firstErrorKey ??= result.error;
        }
      }
      if (firstErrorKey === "errorNoProjectFolder") {
        setNeedsFolder(true);
        return;
      }
      const successes = list.length - failures;
      if (failures > 0) {
        toast.error(t("errorUpload", { count: failures }));
      }
      if (successes > 0) {
        toast.success(t("documentCreated"));
        onChanged();
      }
    });
  }

  function handleCreateFolder() {
    startCreatingFolder(async () => {
      const result = await ensureProjectFolder(projectId);
      if (result?.error) {
        toast.error(tProjects(result.error as "folderLinkError"));
        return;
      }
      toast.success(tProjects("folderLinked"));
      setNeedsFolder(false);
      router.refresh();
    });
  }

  if (!canMutate) return null;

  if (needsFolder) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isCreatingFolder}
        onClick={handleCreateFolder}
        className="w-full"
      >
        {isCreatingFolder ? tProjects("creatingFolder") : tProjects("createFolder")}
      </Button>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        uploadFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-lg border border-dashed px-4 py-3 text-center font-mono text-[11px] transition-colors",
        isDragging
          ? "border-veltol-accent bg-veltol-accent/10 text-veltol-accent"
          : "border-border text-veltol-fgMute hover:border-veltol-accent/50 hover:text-veltol-fg",
        isPending && "pointer-events-none opacity-60",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {isPending ? t("uploading") : t("dropzoneHint")}
    </div>
  );
}
