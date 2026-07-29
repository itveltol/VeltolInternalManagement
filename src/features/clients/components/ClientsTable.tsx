"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { FilterField, FilterDropdown } from "@/shared/components/ui/filter-field";
import { AddClientDialog } from "./AddClientDialog";
import { EditClientDialog } from "./EditClientDialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";
import { useClientsStore } from "../hooks/useClientsStore";
import { CLIENT_TYPES } from "../types";
import type { Client, ClientType } from "../types";
import { cn } from "@/shared/utils/cn";

const PAGE_SIZE = 20;

interface Props {
  clients: Client[];
  canMutate: boolean;
  filterType: ClientType | "";
  onFilterType: (v: ClientType | "") => void;
  highlightId?: number | null;
}

export function ClientsTable({ clients, canMutate, filterType, onFilterType, highlightId }: Props) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const highlightRowRef = useRef<HTMLTableRowElement>(null);

  const {
    isAddDialogOpen, editingClient, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useClientsStore();

  const highlightIndex = highlightId != null
    ? clients.findIndex((c) => c.id === highlightId)
    : -1;
  const highlightPage = highlightIndex >= 0
    ? Math.floor(highlightIndex / PAGE_SIZE) + 1
    : null;

  const [page, setPage] = useState(highlightPage ?? 1);
  const [lastFilterType, setLastFilterType] = useState(filterType);
  const [lastHighlightId, setLastHighlightId] = useState(highlightId);
  const pageCount = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  // Reset to page 1 whenever the filter changes (derived during render, not
  // an effect), then clamp in case the list itself shrank.
  let currentPage = page;
  if (highlightId !== lastHighlightId) {
    setLastHighlightId(highlightId);
    if (highlightPage !== null) {
      currentPage = highlightPage;
      setPage(highlightPage);
    }
  } else if (filterType !== lastFilterType) {
    setLastFilterType(filterType);
    currentPage = 1;
    setPage(1);
  } else if (page !== Math.min(page, pageCount)) {
    currentPage = Math.min(page, pageCount);
    setPage(currentPage);
  }
  const pagedClients = clients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    if (highlightId == null) return;
    highlightRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, currentPage]);

  function handleDelete(clientId: number) {
    if (!confirm(t("confirmDelete"))) return;
    setDeletingId(clientId);
    startTransition(async () => {
      await deleteClientAction(clientId);
      setDeletingId(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <span className="text-xs font-medium text-veltol-fgMute">
              {t("totalCount", { count: clients.length })}
            </span>
          </div>
          {canMutate && (
            <Button onClick={openAddDialog} variant="outline">
              {t("addClient")}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-border px-6 py-3">
          <FilterField label={t("filters.type")} htmlFor="filter-client-type">
            <FilterDropdown
              id="filter-client-type"
              value={filterType}
              onChange={(v) => onFilterType(v as ClientType | "")}
              allLabel={t("filterAllTypes")}
              options={CLIENT_TYPES.map((ct) => ({
                value: ct,
                label: t(`fields.type_${ct}` as Parameters<typeof t>[0]),
              }))}
            />
          </FilterField>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border">
                {[
                  t("columns.name"), t("columns.type"), t("columns.taxId"),
                  t("columns.address"), t("columns.contact"), t("columns.email"), t("columns.phone"), "",
                ].map((col, i) => (
                  <th key={i} className="px-5 py-3 text-left text-[11px] font-medium text-veltol-fgMute">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-veltol-fgMute">
                    {t("emptyState")}
                  </td>
                </tr>
              ) : (
                pagedClients.map((client) => (
                  <tr
                    key={client.id}
                    ref={client.id === highlightId ? highlightRowRef : undefined}
                    className={cn(
                      "group transition-colors hover:bg-veltol-surface/50",
                      client.id === highlightId && "bg-veltol-tint/60 hover:bg-veltol-tint/60",
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-veltol-fg">{client.name}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={client.type === "company" ? "info" : "secondary"}>
                        {t(`fields.type_${client.type}` as Parameters<typeof t>[0])}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-veltol-fgDim">
                      {client.type === "company"
                        ? (client.cui ?? "—")
                        : (client.cnp ?? "—")}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim max-w-[180px] truncate">
                      {client.reg_address ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {client.contact_person ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-veltol-fgDim">
                      {client.email ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-[11px] text-veltol-fgDim">
                      {client.phone ?? "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      {canMutate && (
                        <div className="flex flex-col items-center gap-1">
                          <Button
                            size="icon-sm"
                            variant="outline"
                            title={t("editClient")}
                            onClick={() => openEditDialog(client)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="destructive"
                            title={t("deleteClient")}
                            disabled={isPending && deletingId === client.id}
                            onClick={() => handleDelete(client.id)}
                          >
                            {isPending && deletingId === client.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          prevLabel={t("pagination.prev")}
          nextLabel={t("pagination.next")}
          pageLabel={(p, total) => t("pagination.pageOf", { page: p, total })}
        />
      </div>

      <AddClientDialog
        open={isAddDialogOpen}
        onClose={() => {
          closeAddDialog();
          router.refresh();
        }}
      />

      {editingClient && (
        <EditClientDialog
          client={editingClient}
          open={!!editingClient}
          onClose={() => {
            closeEditDialog();
            router.refresh();
          }}
        />
      )}
    </>
  );
}
