"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Pagination } from "@/shared/components/ui/pagination";
import { AddClientDialog } from "./AddClientDialog";
import { EditClientDialog } from "./EditClientDialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";
import { useClientsStore } from "../hooks/useClientsStore";
import type { Client } from "../types";

const PAGE_SIZE = 20;

interface Props {
  clients: Client[];
  canMutate: boolean;
}

export function ClientsTable({ clients, canMutate }: Props) {
  const t = useTranslations("clients");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    isAddDialogOpen, editingClient, deletingId,
    openAddDialog, closeAddDialog,
    openEditDialog, closeEditDialog,
    setDeletingId,
  } = useClientsStore();

  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(clients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  if (currentPage !== page) setPage(currentPage);
  const pagedClients = clients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
                  <tr key={client.id} className="group transition-colors hover:bg-veltol-surface/50">
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
