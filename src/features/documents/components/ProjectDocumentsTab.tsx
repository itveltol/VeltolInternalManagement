"use client";

import { useTranslations } from "next-intl";
import { DocumentList } from "./DocumentList";
import { AddDocumentDialog } from "./AddDocumentDialog";
import type { Document } from "../types";
import type { Project } from "@/features/projects/types";

interface Props {
  documents: Document[];
  project: Project;
  canMutate: boolean;
}

export function ProjectDocumentsTab({ documents, project, canMutate }: Props) {
  const t = useTranslations("documents");

  return (
    <div className="space-y-6">
      {project.onedrive_folder_url && (
        <a
          href={project.onedrive_folder_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-veltol-accent transition-opacity hover:opacity-75"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          {t("openProjectFolder")}
        </a>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <span className="text-xs font-medium text-veltol-fgMute">
            {t("totalCount", { count: documents.length })}
          </span>
        </div>
        <div className="p-6">
          <DocumentList
            documents={documents}
            linkedType="project"
            linkedId={String(project.id)}
            projectId={project.id}
            contextLabel={project.name}
            canMutate={canMutate}
            compact={false}
          />
        </div>
      </div>

      <AddDocumentDialog />
    </div>
  );
}
