"use client";

import { useState } from "react";
import { DocumentsTable } from "./DocumentsTable";
import { AddDocumentDialog } from "./AddDocumentDialog";
import type { Document } from "../types";

interface Props {
  documents: Document[];
  canMutate: boolean;
}

export function DocumentsShell({ documents, canMutate }: Props) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? documents.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : documents;

  return (
    <>
      <DocumentsTable
        documents={filtered}
        canMutate={canMutate}
        search={search}
        onSearchChange={setSearch}
      />
      <AddDocumentDialog />
    </>
  );
}
