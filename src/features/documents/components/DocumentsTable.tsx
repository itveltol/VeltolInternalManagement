"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterDropdown, FilterInput } from "@/shared/components/ui/filter-field";
import { TableShell, TableToolbar, TableDesktopView } from "@/shared/components/ui/table-shell";
import {
  DataCardList, DataCard, DataCardHeader, DataCardTitle,
  DataCardBadgeSlot, DataCardBody, DataCardField, DataCardFooter,
} from "@/shared/components/ui/data-card";
import { deleteDocumentAction } from "@/app/[locale]/(app)/documents/actions";
import { useDocumentsStore } from "../hooks/useDocumentsStore";
import { useConfirm } from "@/shared/components/ui/confirm-dialog";
import { formatDate } from "@/shared/utils/formatDate";
import type { Document, DocumentLinkedType, DocumentStatus, DocumentCategory } from "../types";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES } from "../types";

const PAGE_SIZE = 20;

interface Props {
  documents: Document[];
  canMutate: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  filterCategory: DocumentCategory | "";
  onFilterCategory: (v: DocumentCategory | "") => void;
  filterStatus: DocumentStatus | "";
  onFilterStatus: (v: DocumentStatus | "") => void;
}

function linkedTypeVariant(type: DocumentLinkedType) {
  switch (type) {
    case "project":        return "default";
    case "client":         return "outline";
    case "matrice_cell":   return "secondary";
    case "checklist_item": return "secondary";
    default:               return "outline";
  }
}

function statusVariant(status: DocumentStatus | null) {
  switch (status) {
    case "obtained":   return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
    case "submitted":  return "bg-blue-500/15 text-blue-400 border-blue-500/20";
    case "pending":    return "bg-white/5 text-veltol-fgMute border-border";
    case "rejected":
    case "expired":    return "bg-veltol-red/15 text-veltol-red border-veltol-red/20";
    default:           return "bg-white/5 text-veltol-fgMute border-border";
  }
}

function statusBadgeVariant(status: DocumentStatus | null): "success" | "info" | "secondary" | "destructive" {
  switch (status) {
    case "obtained":   return "success";
    case "submitted":  return "info";
    case "rejected":
    case "expired":    return "destructive";
    default:           return "secondary";
  }
}

function expiryState(expiresAt: string | null, status: DocumentStatus | null): "expired" | "soon" | "ok" | null {
  if (status === "expired") return "expired";
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff < 0) return "expired";
  if (diff < 30 * 24 * 60 * 60 * 1000) return "soon";
  return "ok";
}

function fullName(p: { first_name: string | null; last_name: string | null } | null | undefined) {
  if (!p) return "—";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || "—";
}

export function DocumentsTable({
  documents,
  canMutate,
  search,
  onSearchChange,
  filterCategory,
  onFilterCategory,
  filterStatus,
  onFilterStatus,
}: Props) {
  const t = useTranslations("documents");
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const { openEditDialog } = useDocumentsStore();

  const [page, setPage] = useState(1);
  const [lastFilterKey, setLastFilterKey] = useState(`${search}:${filterCategory}:${filterStatus}`);
  const filterKey = `${search}:${filterCategory}:${filterStatus}`;
  const pageCount = Math.max(1, Math.ceil(documents.length / PAGE_SIZE));
  // Reset to page 1 whenever the search/filter combo changes (derived during
  // render, not an effect), then clamp in case the list itself shrank.
  let currentPage = page;
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    currentPage = 1;
    setPage(1);
  } else if (page !== Math.min(page, pageCount)) {
    currentPage = Math.min(page, pageCount);
    setPage(currentPage);
  }
  const pagedDocuments = documents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleDelete(doc: Document) {
    const ok = await confirm({ title: t("confirmDelete"), confirmLabel: t("delete") });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteDocumentAction(doc.id, doc.project_id ?? undefined);
      if (result?.error) toast.error(t(result.error as "errorGeneric"));
      else if (result?.success) toast.success(t(result.success as "documentDeleted"));
      router.refresh();
    });
  }

  return (
    <TableShell>
      {/* Toolbar */}
      <TableToolbar>
        <span className="text-xs font-medium text-veltol-fgMute">
          {t("totalCount", { count: documents.length })}
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label={t("filters.search")} htmlFor="filter-doc-search">
            <FilterInput
              id="filter-doc-search"
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("fields.namePlaceholder")}
              className="w-48"
            />
          </FilterField>
          <FilterField label={t("filters.category")} htmlFor="filter-doc-category">
            <FilterDropdown
              id="filter-doc-category"
              value={filterCategory}
              onChange={(v) => onFilterCategory(v as DocumentCategory | "")}
              allLabel={t("filterAll")}
              options={DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))}
            />
          </FilterField>
          <FilterField label={t("filters.status")} htmlFor="filter-doc-status">
            <FilterDropdown
              id="filter-doc-status"
              value={filterStatus}
              onChange={(v) => onFilterStatus(v as DocumentStatus | "")}
              allLabel={t("filterAllStatuses")}
              options={DOCUMENT_STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          </FilterField>
        </div>
      </TableToolbar>

      <TableDesktopView>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border">
              {[
                t("columns.name"),
                t("columns.category"),
                t("columns.status"),
                t("columns.responsible"),
                t("columns.linkedTo"),
                t("columns.expiry"),
                t("columns.actions"),
              ].map((col, i) => (
                <th
                  key={i}
                  className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                  {t("emptyState")}
                </td>
              </tr>
            ) : (
              pagedDocuments.map((doc) => {
                const expiry = expiryState(doc.expires_at, doc.status);
                return (
                  <tr key={doc.id} className="group transition-colors hover:bg-veltol-surface/50">
                    {/* Name */}
                    <td className="px-5 py-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[12px] text-veltol-accent underline-offset-2 hover:underline"
                      >
                        {doc.name}
                      </a>
                      {doc.version > 1 && (
                        <span className="ml-1.5 font-mono text-[10px] text-veltol-fgMute">v{doc.version}</span>
                      )}
                    </td>
                    {/* Category */}
                    <td className="px-5 py-3">
                      {doc.category ? (
                        <Badge variant="secondary" className="font-mono text-[9px]">
                          {t(`category.${doc.category}`)}
                        </Badge>
                      ) : (
                        <span className="font-mono text-[11px] text-veltol-fgMute">—</span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      {doc.status ? (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide ${statusVariant(doc.status)}`}>
                          {t(`status.${doc.status}`)}
                        </span>
                      ) : (
                        <span className="font-mono text-[11px] text-veltol-fgMute">—</span>
                      )}
                    </td>
                    {/* Responsible */}
                    <td className="px-5 py-3 font-mono text-[11px] text-veltol-fgDim">
                      {fullName(doc.responsible)}
                    </td>
                    {/* Linked to */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={linkedTypeVariant(doc.linked_type)} className="w-fit font-mono text-[9px]">
                          {t(`linkedType.${doc.linked_type}`)}
                        </Badge>
                        {doc.project && (
                          <span className="font-mono text-[11px] text-veltol-fgDim">{doc.project.name}</span>
                        )}
                      </div>
                    </td>
                    {/* Expiry */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        {doc.is_renewable && (
                          <Badge variant="secondary" className="w-fit font-mono text-[9px]">
                            {t("renewable")}
                          </Badge>
                        )}
                        {doc.expires_at ? (
                          <span className={
                            expiry === "expired" ? "font-mono text-[11px] text-veltol-red" :
                            expiry === "soon"    ? "font-mono text-[11px] text-veltol-orange" :
                                                   "font-mono text-[11px] text-veltol-fgMute"
                          }>
                            {expiry === "expired" ? t("expired") : t("expiresOn", { date: formatDate(doc.expires_at) })}
                          </span>
                        ) : (
                          !doc.is_renewable && <span className="font-mono text-[11px] text-veltol-fgMute">—</span>
                        )}
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t("openDocument")}
                          className="inline-flex size-7 items-center justify-center rounded-md border border-border text-veltol-fgDim transition-colors hover:border-veltol-accent/30 hover:text-veltol-accent"
                        >
                          <ExternalLink className="size-3.5" />
                        </a>
                        {canMutate && (
                          <>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              title={t("edit")}
                              onClick={() => openEditDialog(doc)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="destructive"
                              title={t("delete")}
                              disabled={isPending}
                              onClick={() => handleDelete(doc)}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </TableDesktopView>

      {documents.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-veltol-fgMute md:hidden">{t("emptyState")}</p>
      ) : (
        <DataCardList>
          {pagedDocuments.map((doc) => {
            const expiry = expiryState(doc.expires_at, doc.status);
            return (
              <DataCard key={doc.id}>
                <DataCardHeader>
                  <div className="min-w-0">
                    <DataCardTitle className="font-mono text-[13px] text-veltol-accent">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                        {doc.name}
                      </a>
                      {doc.version > 1 && (
                        <span className="ml-1.5 font-mono text-[10px] text-veltol-fgMute">v{doc.version}</span>
                      )}
                    </DataCardTitle>
                  </div>
                  {doc.status && (
                    <DataCardBadgeSlot>
                      <Badge variant={statusBadgeVariant(doc.status)} className="font-mono text-[9px] uppercase tracking-wide">
                        {t(`status.${doc.status}`)}
                      </Badge>
                    </DataCardBadgeSlot>
                  )}
                </DataCardHeader>

                <DataCardBody>
                  <DataCardField label={t("columns.category")}>
                    {doc.category ? t(`category.${doc.category}`) : "—"}
                  </DataCardField>
                  <DataCardField label={t("columns.responsible")}>{fullName(doc.responsible)}</DataCardField>
                  <DataCardField label={t("columns.linkedTo")} full>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={linkedTypeVariant(doc.linked_type)} className="font-mono text-[9px]">
                        {t(`linkedType.${doc.linked_type}`)}
                      </Badge>
                      {doc.project && <span>{doc.project.name}</span>}
                    </div>
                  </DataCardField>
                  <DataCardField label={t("columns.expiry")} full>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {doc.is_renewable && (
                        <Badge variant="secondary" className="font-mono text-[9px]">{t("renewable")}</Badge>
                      )}
                      {doc.expires_at ? (
                        <span className={
                          expiry === "expired" ? "text-veltol-red" :
                          expiry === "soon"    ? "text-veltol-orange" : undefined
                        }>
                          {expiry === "expired" ? t("expired") : t("expiresOn", { date: formatDate(doc.expires_at) })}
                        </span>
                      ) : (
                        !doc.is_renewable && "—"
                      )}
                    </div>
                  </DataCardField>
                </DataCardBody>

                <DataCardFooter>
                  <Button
                    variant="outline"
                    className="flex-1"
                    nativeButton={false}
                    render={<a href={doc.url} target="_blank" rel="noopener noreferrer" />}
                  >
                    <ExternalLink data-icon="inline-start" /> {t("openDocument")}
                  </Button>
                  {canMutate && (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => openEditDialog(doc)}>
                        <Pencil data-icon="inline-start" /> {t("edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isPending}
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 data-icon="inline-start" /> {t("delete")}
                      </Button>
                    </>
                  )}
                </DataCardFooter>
              </DataCard>
            );
          })}
        </DataCardList>
      )}

      <Pagination
        page={currentPage}
        pageCount={pageCount}
        onPageChange={setPage}
        prevLabel={t("pagination.prev")}
        nextLabel={t("pagination.next")}
        pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
      />
    </TableShell>
  );
}
