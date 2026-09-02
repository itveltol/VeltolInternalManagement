"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LabeledDocumentSections } from "./LabeledDocumentSections";
import { AddDocumentDialog } from "./AddDocumentDialog";
import { ProjectFilesTab } from "./ProjectFilesTab";
import { FilterField, FilterInput } from "@/shared/components/ui/filter-field";
import type { Document } from "../types";
import type { Project } from "@/features/projects/types";
import type { Activity } from "@/features/matrice/types";
import type { DriveChildItem } from "@/core/microsoft/folderProvider";

interface Props {
  documents: Document[];
  project: Project;
  canMutate: boolean;
  activities: Activity[];
  folderChildren: DriveChildItem[];
  onChanged: () => void;
}

type ViewMode = "list" | "tree";

export function ProjectDocumentsTab({ documents, project, canMutate, activities, folderChildren, onChanged }: Props) {
  const t = useTranslations("documents");
  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");

  const filteredDocuments = search.trim()
    ? documents.filter((doc) => doc.name.toLowerCase().includes(search.trim().toLowerCase()))
    : documents;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {view === "list" ? (
          <FilterField label={t("searchPlaceholder")} htmlFor="documents-search">
            <FilterInput
              id="documents-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-56"
            />
          </FilterField>
        ) : (
          <div />
        )}

        <div className="flex gap-1 rounded-lg border border-border bg-veltol-surface/60 p-0.5">
          <button
            type="button"
            onClick={() => setView("list")}
            className={
              view === "list"
                ? "rounded-md bg-veltol-accent/10 px-3 py-1.5 text-[12px] font-semibold text-veltol-accent"
                : "px-3 py-1.5 text-[12px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
            }
          >
            {t("viewList")}
          </button>
          <button
            type="button"
            onClick={() => setView("tree")}
            className={
              view === "tree"
                ? "rounded-md bg-veltol-accent/10 px-3 py-1.5 text-[12px] font-semibold text-veltol-accent"
                : "px-3 py-1.5 text-[12px] text-veltol-fgMute transition-colors hover:text-veltol-fgDim"
            }
          >
            {t("viewTree")}
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <span className="text-xs font-medium text-veltol-fgMute">
              {t("totalCount", { count: filteredDocuments.length })}
            </span>
          </div>
          <div className="p-6">
            <LabeledDocumentSections
              documents={filteredDocuments}
              projectId={project.id}
              canMutate={canMutate}
              activities={activities}
              onChanged={onChanged}
            />
          </div>
        </div>
      ) : (
        <ProjectFilesTab
          rootFolderId={project.onedrive_folder_id}
          initialChildren={folderChildren}
        />
      )}

      <AddDocumentDialog />
    </div>
  );
}
