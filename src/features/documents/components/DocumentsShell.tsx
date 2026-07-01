"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/ui/button";
import { DocumentsTable } from "./DocumentsTable";
import { AddDocumentDialog } from "./AddDocumentDialog";
import { EditDocumentDialog } from "./EditDocumentDialog";
import { useDocumentsStore } from "../hooks/useDocumentsStore";
import { getResponsibleProfilesAction } from "@/app/[locale]/(app)/documents/actions";
import type { Document, DocumentCategory, DocumentStatus } from "../types";

interface Props {
  documents: Document[];
  canMutate: boolean;
}

export function DocumentsShell({ documents, canMutate }: Props) {
  const t = useTranslations("documents");
  const { openAddDialog, setResponsibleProfiles } = useDocumentsStore();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<DocumentCategory | "">("");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "">("");

  useEffect(() => {
    getResponsibleProfilesAction().then(setResponsibleProfiles).catch(() => {});
  }, []);

  const filtered = documents.filter((d) => {
    if (search.trim() && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && d.category !== filterCategory) return false;
    if (filterStatus && d.status !== filterStatus) return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <div />
        {canMutate && (
          <Button
            onClick={() =>
              openAddDialog({
                linkedType: "project",
                linkedId: "global",
                projectId: null,
                contextLabel: t("globalContext"),
              })
            }
          >
            {t("addDocument")}
          </Button>
        )}
      </div>

      <DocumentsTable
        documents={filtered}
        canMutate={canMutate}
        search={search}
        onSearchChange={setSearch}
        filterCategory={filterCategory}
        onFilterCategory={setFilterCategory}
        filterStatus={filterStatus}
        onFilterStatus={setFilterStatus}
      />
      <AddDocumentDialog />
      <EditDocumentDialog />
    </>
  );
}
